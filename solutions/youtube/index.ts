import sortedSubscriptions from '../ignore/data/youtube/Y Combinator/sortedSubscriptions.json'

import { auth, youtube, youtube_v3 } from '@googleapis/youtube'
import { DEVELOPER_KEY } from '../ignore/config'

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
// import { analysis } from '../../lib/analysis'
import { inference } from './inference'
import { join } from 'path'

import { iSubscriptionDB } from '../../data/db/models'

const PART = [
    'id',
    'status',
    'snippet',
    'statistics',
    'topicDetails',
    'localizations',
    'contentDetails'
]

const DATA_DIR = './ignore/data/youtube'
const sleep = (secs:number) => new Promise(resolve => setTimeout(resolve, secs*1000))


interface iGetChannelVideosInput { 
    channelId:string, 
    forHandle?:boolean, 
    getShorts?:boolean 
    write?:boolean
}


let authClient:any
const getYTClient = async() => {
    console.log('Getting YT client')
    const googleAuth = new auth.GoogleAuth({ apiKey:DEVELOPER_KEY })
    const authClient = await googleAuth.getClient()
    return authClient
}


export const getChannelVideos = async(props:iGetChannelVideosInput) => {
    if(!authClient) authClient = await getYTClient()
    const { channelId, forHandle=true, write, getShorts } = props

    const client = youtube('v3')
    const input = forHandle ? { forHandle: channelId } : { id: [channelId] }
    const { data:channelResponse } = await client.channels.list({ 
        part:[...PART, 'contentOwnerDetails', 'brandingSettings'],
        auth:authClient.apiKey,
        ...input
    })

    const [ channel ] = channelResponse.items!

    // Create channel dir
    const channelName = channel.snippet?.title
    if(!channelName) throw new Error('No channel name found')

    console.log(channelName)
    const channelDir = join(DATA_DIR, channelName!)
    if(write && !existsSync(channelDir)) mkdirSync(channelDir)

    const channelPath = join(channelDir, 'channel.json')
    if(write) writeFileSync(channelPath, JSON.stringify(channel, null, 2))

    const playlistId = channel.contentDetails?.relatedPlaylists?.uploads

    if(!playlistId) throw new Error('No playlist found')

    const playlist:youtube_v3.Schema$PlaylistItem[][] = []

    const playlistPrefix = getShorts ? 'UUSH' : 'UULF'
    const listVideos = async(nextPageToken?:string) => {
        await sleep(1)
        const { data:playlist } = await client.playlistItems.list({
            part:['id', 'contentDetails', 'snippet', 'status'],
            playlistId: playlistId.replace('UU', playlistPrefix), 
            maxResults:50,
            auth:authClient.apiKey,
            pageToken: nextPageToken
        })

        console.log('getChannelVideos', channelName, playlist.items?.length, 'videos')
        return playlist
    }

    let data:youtube_v3.Schema$PlaylistItemListResponse = await listVideos()
    playlist.push(data.items!)

    while(true) {
        const nextPageToken = data?.nextPageToken
        if(!nextPageToken) break

        // If last video is older than one year, break.
        const lastVideo = data.items?.slice(-1)[0]
        const lastPublishedAt = lastVideo?.snippet?.publishedAt
        if(!lastPublishedAt) break

        const age = new Date().getTime() - new Date(lastPublishedAt).getTime()
        if(age > 365*24*60*60*1000) break        

        data = await listVideos(nextPageToken)
        playlist.push(data.items!)
    } 

    const allVideos:youtube_v3.Schema$Video[] = []
    for await(const list of playlist) {
        if(allVideos.length > 1000) break

        const videoIds = list.map(({ contentDetails }) => contentDetails?.videoId!)
        .filter(Boolean) || []

        const {data: {items: videos}} = await client.videos.list({
            part: [...PART, 'liveStreamingDetails', 'player', 'recordingDetails'],
            auth:authClient.apiKey,
            id: videoIds
        })

        allVideos.push(...videos!)
    }

    const videosPath = join(channelDir, 'videos.json')
    if(write) writeFileSync(videosPath, JSON.stringify(allVideos, null, 2))
    return { channel, videos: allVideos }
}

export const getComments = async(videoId: string) => {
    const client = youtube('v3')
    if(!authClient) authClient = await getYTClient()

    const listComments = async(videoId:string, nextPageToken?:string) => {
        await sleep(1)

        const { data } = await client.commentThreads.list({
            part:['id', 'replies', 'snippet'],
            pageToken: nextPageToken,
            auth:authClient.apiKey,
            maxResults: 100,
            videoId
        })

        return data
    }

    const comments:youtube_v3.Schema$CommentThread[] = []
    try { 
        let data = await listComments(videoId)

        while(true) {
            comments.push(...data.items!)

            const { nextPageToken } = data
            if(!nextPageToken) break
            if(comments.length >= 1000) break

            data = await listComments(videoId, nextPageToken)
        }
    } catch(e) {}

    console.log(videoId, comments.length)
    return comments
}

const getAllComments = (channelId:string, page:number) => {
    // Iterate through comments directory.
    const pageSize = 100
    const commentsDir = join(DATA_DIR, channelId, 'comments')
    const files = readdirSync(commentsDir)

    const allComments:youtube_v3.Schema$CommentThread[] = []
    for(const idx in files) {
        const index = (page * pageSize) + Number(idx)
        const commentsPath = join(commentsDir, files[index])
        const commentsBuffer = readFileSync(commentsPath)
        const comments = JSON.parse(commentsBuffer.toString())
        allComments.push(...comments)

        if(idx == pageSize.toString()) break
    }

    console.log(allComments.length)
    return allComments
} 

export const getSubscriptions = async(channelId:string) => {
    const client = youtube('v3')
    const authClient = await getYTClient()

    const listChannels = async(channelId:string, nextPageToken?:string) => {
        await sleep(1)
        const { data } = await client.subscriptions.list({
            part:['id', 'snippet', 'contentDetails'],
            channelId,
            auth:authClient.apiKey,
            maxResults: 50,
            pageToken: nextPageToken
        })

        return data
    }

    const subscriptions:youtube_v3.Schema$Subscription[] = []

    let data = await listChannels(channelId)
    while(true) {
        subscriptions.push(...data.items!)

        const nextPageToken = data.nextPageToken
        if(!nextPageToken) break

        data = await listChannels(channelId, nextPageToken)
    }

    return subscriptions
}


export const countSubscriptions = (subscriptions:iSubscriptionDB[]) => {
    const subsciptionsCounter = subscriptions.reduce((acc, { channelId }, idx) => {
        // Log if mod 1000.
        if(idx % 1000 == 0) console.log(idx)
        if(idx > 45000) return acc
        if(!channelId) return acc
        return { ...acc, [channelId!]: (acc[channelId!] || 0) + 1 }
    }, {} as Record<string, number>)
    console.log('subsciptionsCounter', Object.keys(subsciptionsCounter).length)

    const sortedSubscriptions = Object.entries(subsciptionsCounter)
    .map(([channelId, count]) => ({channelId, count}))
    .sort((a, b) => b.count - a.count)
    .filter(({ count }) => count > 1)
    console.log('sortedSubscriptions', sortedSubscriptions.length)

    return sortedSubscriptions

} 

const getAllSubscriptions = (channelId:string, page:number) => {
    // Iterate through subscriptions directory.
    const subscriptionsDir = join(DATA_DIR, channelId, 'subscriptions')
    const files = readdirSync(subscriptionsDir)
    const pageSize = 2000

    const allSubscriptions:youtube_v3.Schema$Subscription[] = []
    for(const idx in files) {
        const index = (page * pageSize) + Number(idx)
        const subscriptionsPath = join(subscriptionsDir, files[index])
        const subscriptionsBuffer = readFileSync(subscriptionsPath)
        const subscriptions: youtube_v3.Schema$SubscriptionListResponse = JSON.parse(subscriptionsBuffer.toString())
        allSubscriptions.push(...subscriptions.items!)

        if(idx == pageSize.toString()) break
    }

    console.log(allSubscriptions.length)
    return allSubscriptions
} 


const index = async() => {
    const googleAuth = new auth.GoogleAuth({ apiKey:DEVELOPER_KEY })
    const authClient = await googleAuth.getClient()

    const channelId = 'ycombinator'
    const channelName = 'Y Combinator'

//    const {videos, channelName} = await getChannel(channelId, authClient)
//    await inference(videos, `${DATA_DIR}/${channelName}`)

    // Get comments.
//    await getComments(videos as youtube_v3.Schema$Video[], authClient, channelName)
//    const comments = getAllComments(channelName, 0)

    // Get subscriptions.
//    await getSubscriptions(comments, authClient, channelName)

/*
    const subscriptions:youtube_v3.Schema$Subscription[] = getAllSubscriptions(channelName, 0)

    const subsciptionsCounter = subscriptions.reduce((acc, { snippet }, idx) => {
        // Log if mod 1000.
        if(idx % 1000 == 0) console.log(idx)
        if(idx > 45000) return acc
        const channelId = snippet?.resourceId?.channelId
        if(!channelId) return acc
        return { ...acc, [channelId!]: (acc[channelId!] || 0) + 1 }
    }, {} as Record<string, number>)
    console.log('subsciptionsCounter', Object.keys(subsciptionsCounter).length)

    const sortedSubscriptions = Object.entries(subsciptionsCounter)
    .map(([channelId, count]) => ({channelId, count}))
    .sort((a, b) => b.count - a.count)
    .filter(({ count }) => count > 1)
    console.log('sortedSubscriptions', sortedSubscriptions.length)

    const subscriptionsPath = join(DATA_DIR, channelName, 'sortedSubscriptions.json')
    writeFileSync(subscriptionsPath, JSON.stringify(sortedSubscriptions, null, 2))

    // Get videos from subscriptions.
    return
    
    for await(const { channelId } of sortedSubscriptions) {
        console.log(channelId)

        try{
            await sleep(5)
            if(!channelId) continue

            const { videos, channelName } = await getChannelVideos(channelId, authClient, false)
            await inference(videos, `${DATA_DIR}/${channelName}`)
        } catch(e) { continue }
    }
*/
}

// index().catch()

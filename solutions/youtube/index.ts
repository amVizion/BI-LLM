import sortedSubscriptions from '../ignore/data/youtube/20VC/sortedSubscriptions.json'

import { auth, youtube, youtube_v3 } from '@googleapis/youtube'
import { DEVELOPER_KEY } from '../ignore/config'

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
// import { analysis } from '../../lib/analysis'
import { join } from 'path'

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

const getChannel = async(channelId:string, authClient:any, forHandle:boolean=true) => { // TODO: Add versioned data.

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
    console.log(channelName)
    const channelDir = join(DATA_DIR, channelName!)
    if(!existsSync(channelDir)) mkdirSync(channelDir)

    const channelPath = join(channelDir, 'channel.json')
    writeFileSync(channelPath, JSON.stringify(channel, null, 2))

    const playlistId = channel.contentDetails?.relatedPlaylists?.uploads

    if(!playlistId) throw new Error('No playlist found')

    const playlist:youtube_v3.Schema$PlaylistItem[][] = []

    const listVideos = async(nextPageToken?:string) => {
        await sleep(1)
        const { data:playlist } = await client.playlistItems.list({
            part:['id', 'contentDetails', 'snippet', 'status'],
            playlistId: playlistId.replace('UU', 'UUSH'), // Filters out shorts.
            maxResults:50,
            auth:authClient.apiKey,
            pageToken: nextPageToken
        })

//        console.log(playlist.items?.length)
        return playlist
    }

    let data:youtube_v3.Schema$PlaylistItemListResponse = await listVideos()
    while(true) {
        const nextPageToken = data?.nextPageToken
        if(!nextPageToken) break

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

    const videosPath = join(channelDir, 'shorts.json')
    writeFileSync(videosPath, JSON.stringify(allVideos, null, 2))
    return allVideos as youtube_v3.Schema$Video[]
}

const getComments = async(videos: youtube_v3.Schema$Video[], authClient:any, channelId:string) => {
    const client = youtube('v3')
    const videoIds = videos.map(({ id }) => id)

    const channelDir = join(DATA_DIR, channelId)
    const commentsDir = join(channelDir, 'comments')
    if(!existsSync(commentsDir)) mkdirSync(commentsDir)

    const listComments = async(videoId:string, nextPageToken?:string) => {
        await sleep(1)

        const { data } = await client.commentThreads.list({
            part:['id', 'replies', 'snippet'],
            pageToken: nextPageToken,
            auth:authClient.apiKey,
            maxResults: 100,
            videoId
        })

        const page = nextPageToken ? `_${nextPageToken}` : 0
        const commentsPath = join(commentsDir, `${videoId}-${page}.json`)
        writeFileSync(commentsPath, JSON.stringify(comments, null, 2))

        return data
    }

    const comments:youtube_v3.Schema$CommentThread[] = []

    for await(const videoId of videoIds) {
        console.log(videoId)

        const commentsPath = join(commentsDir, `${videoId}.json`)
        if(!videoId || existsSync(commentsPath)) continue


        try { 
            let data = await listComments(videoId)

            while(true) {
                comments.push(...data.items!)

                const { nextPageToken } = data
                if(!nextPageToken) break

                data = await listComments(videoId, nextPageToken)
            }
        } catch(e) { continue }
    }

    console.log(comments.length)

    const commentsPath = join(channelDir, 'comments.json')
    writeFileSync(commentsPath, JSON.stringify(comments, null, 2))
    return comments
}

const getAllComments = (channelId:string, page:number) => {
    // Iterate through comments directory.
    const pageSize = 250
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


const getSubscriptions = async(comments:youtube_v3.Schema$CommentThread[], authClient:any, channelId:string) => {
    const client = youtube('v3')

    const channelDir = join(DATA_DIR, channelId)
    const subscriptionsDir = join(channelDir, 'subscriptions')
    if(!existsSync(subscriptionsDir)) mkdirSync(subscriptionsDir)

    const channelIds = comments.map(({ snippet }) => snippet?.topLevelComment?.snippet?.authorChannelId?.value)
    .filter(Boolean) || []

    const uniqueChannelIds = Array.from(new Set(channelIds))

    const listChannels = async(channelId:string, nextPageToken?:string) => {
        await sleep(1)
        const { data } = await client.subscriptions.list({
            part:['id', 'snippet', 'contentDetails'],
            channelId,
            auth:authClient.apiKey,
            maxResults: 50,
            pageToken: nextPageToken
        })

        const page = nextPageToken ? `_${nextPageToken}` : 0
        const subscriptionsPath = join(subscriptionsDir, `${channelId}-${page}.json`)
        writeFileSync(subscriptionsPath, JSON.stringify(data, null, 2))
        return data
    }

    const subscriptions:youtube_v3.Schema$Subscription[] = []

    for await(const channelId of uniqueChannelIds) {
        if(!channelId) continue
        try {
            let data = await listChannels(channelId)

            while(true) {
                subscriptions.push(...data.items!)

                const nextPageToken = data.nextPageToken
                if(!nextPageToken) break

                data = await listChannels(channelId, nextPageToken)
            } 
        } catch(e) { continue }
    }

    console.log(subscriptions.length)

    const subscriptionsPath = join(DATA_DIR, channelId, 'subscriptions.json')
    writeFileSync(subscriptionsPath, JSON.stringify(subscriptions, null, 2))
    return subscriptions
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

    const channelId = '20VC with Harry Stebbings'

//    const videos = await getChannel(channelId, authClient)
    // await inference(videos)

    // Get comments.
//    await getComments(videos as youtube_v3.Schema$Video[], authClient, channelId)
//    const comments = getAllComments(channelId, 0)

    // Get subscriptions.
//    await getSubscriptions(comments, authClient, channelId)
//    const subscriptions = getAllSubscriptions(channelId, 0)

    // Get videos from subscriptions.

/*    
    const subsciptionsCounter = (subscriptions as youtube_v3.Schema$Subscription[]).reduce((acc, { snippet }, idx) => {
        // Log if mod 1000.
        if(idx % 1000 == 0) console.log(idx)
        if(idx > 25000) return acc
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

    const subscriptionsPath = join(DATA_DIR, channelId, 'sortedSubscriptions.json')
    writeFileSync(subscriptionsPath, JSON.stringify(sortedSubscriptions, null, 2))
*/


    for await(const { channelId } of sortedSubscriptions) {
        console.log(channelId)

        try{
            await sleep(5)
            if(!channelId) continue

            await getChannel(channelId, authClient, false)
        } catch(e) { 
            console.log(e)
            continue 
        }
        // await inference(videos)
    }



}

index().catch()

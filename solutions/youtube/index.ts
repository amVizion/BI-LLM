import subscriptions from '../ignore/data/youtube/AnnaStepura/subscriptions.json'
import comments from '../ignore/data/youtube/AnnaStepura/comments/comments.json'

import { auth, youtube, youtube_v3 } from '@googleapis/youtube'
import { DEVELOPER_KEY } from '../ignore/config'

import { existsSync, mkdirSync, writeFileSync } from 'fs'
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
    const { data } = await client.channels.list({ 
        part:[...PART, 'contentOwnerDetails', 'brandingSettings'],
        auth:authClient.apiKey,
        ...input
    })

    const [ channel ] = data.items!

    // Create channel dir
    const channelName = channel.snippet?.title
    const channelDir = join(DATA_DIR, channelName!)
    if(!existsSync(channelDir)) mkdirSync(channelDir)

    const channelPath = join(channelDir, 'channel.json')
    writeFileSync(channelPath, JSON.stringify(channel, null, 2))

    const playlistId = channel.contentDetails?.relatedPlaylists?.uploads

    if(!playlistId) throw new Error('No playlist found')

    const { data: { items:playlist } } = await client.playlistItems.list({
        part:['id', 'contentDetails', 'snippet', 'status'],
        playlistId: playlistId.replace('UU', 'UULF'), // Filters out shorts.
        maxResults:50,
        auth:authClient.apiKey
    })

    const videoIds = playlist!.map(({ contentDetails }) => contentDetails?.videoId!)
    .filter(Boolean) || []

    const {data: {items: videos}} = await client.videos.list({
        part: [...PART, 'liveStreamingDetails', 'player', 'recordingDetails'],
        auth:authClient.apiKey,
        id: videoIds
    })

    const videosPath = join(channelDir, 'videos.json')
    writeFileSync(videosPath, JSON.stringify(videos, null, 2))
    return videos as youtube_v3.Schema$Video[]
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

        const commentsPath = join(commentsDir, `${videoId}.json`)
        writeFileSync(commentsPath, JSON.stringify(comments, null, 2))
    
        return data
    }

    const comments:youtube_v3.Schema$CommentThread[] = []

    for await(const videoId of videoIds) {
        if(!videoId) continue
        let data = await listComments(videoId)
        while(true) {
            comments.push(...data.items!)

            const { nextPageToken } = data
            if(!nextPageToken) break

            data = await listComments(videoId, nextPageToken)
        }
    }

    console.log(comments.length)

    const commentsPath = join(channelDir, 'comments.json')
    writeFileSync(commentsPath, JSON.stringify(comments, null, 2))
    return comments
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
        
        const subscriptionsPath = join(subscriptionsDir, `${channelId}.json`)
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

const index = async() => {
    const googleAuth = new auth.GoogleAuth({ apiKey:DEVELOPER_KEY })
    const authClient = await googleAuth.getClient()

    const channelId = 'AnnaStepura'

    const videos = await getChannel(channelId, authClient)
    // await inference(videos)

    // Get comments.
//    const comments = await getComments(videos, authClient, channelId)

    // Get subscriptions.
//    const subscriptions = await getSubscriptions(comments, authClient, channelId)

    // Get videos from subscriptions.

    const subsciptionsCounter = (subscriptions as youtube_v3.Schema$Subscription[]).reduce((acc, { snippet }) => {
        const channelId = snippet?.resourceId?.channelId
        if(!channelId) return acc
        return { ...acc, [channelId!]: (acc[channelId!] || 0) + 1 }
    }, {} as Record<string, number>)

    const sortedSubscriptions = Object.entries(subsciptionsCounter)
    .map(([channelId, count]) => ({channelId, count}))
    .sort((a, b) => b.count - a.count)
    .filter(({ count }) => count > 1)

    const subscriptionsPath = join(DATA_DIR, channelId, 'sortedSubscriptions.json')
    writeFileSync(subscriptionsPath, JSON.stringify(sortedSubscriptions, null, 2))


    for await(const { channelId } of sortedSubscriptions) {
        try{
            await sleep(5)
            if(!channelId) continue

            await getChannel(channelId, authClient, false)
        } catch(e) { 
            console.log(channelId)
            console.log(e)
            continue 
        }
        // await inference(videos)
    }

}

index().catch()

import { auth, youtube } from '@googleapis/youtube'
import { iInputText } from '../../lib/utils/types'
import { DEVELOPER_KEY } from '../ignore/config'

import { analysis } from '../../lib/analysis'

const PART = [
    'id',
    'status',
    'snippet',
    'statistics',
    'topicDetails',
    'localizations',
    'contentDetails'
]
 
const index = async(channelId:string) => {     
    const googleAuth = new auth.GoogleAuth({ apiKey:DEVELOPER_KEY })
    const authClient = await googleAuth.getClient()

    const client = youtube('v3')
    const { data } = await client.channels.list({ 
        part:[...PART, 'contentOwnerDetails', 'brandingSettings'], 
        forHandle: channelId, 
        auth:authClient.apiKey
    })

    const [ channel ] = data.items!

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

    // Get views & titles from videos
    const videoData = videos!.map(({ id, snippet, statistics }) => ({
        id,
        title: snippet?.title!,
        views: statistics?.viewCount!,
    })).filter(({ views }) => views)

    const texts:iInputText[] = videoData.map(({ title, views }) => ({ 
        text:title, 
        output:Number(views) 
    }))

    await analysis(texts)    
    return texts
}

index('AnnaStepura').catch()

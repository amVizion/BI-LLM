import { youtube_v3 } from '@googleapis/youtube'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

import { iInputText } from '../../lib/utils/types'
import { analysis } from '../../lib/analysis'

// Iterate through channels/data directory
const DATA_DIR = './ignore/data/youtube'

export const inference = async(videos:youtube_v3.Schema$Video[], dir:string) => {
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

    await analysis(texts, dir)
}


const getChannels = async() => {
    const channels = readdirSync(DATA_DIR)

    // For each channel get the videos.json file
    for (const channel of channels) {
        const channelDir = join(DATA_DIR, channel)
        const videosPath = join(channelDir, 'videos.json')
        const buffer = readFileSync(videosPath)
        const videos:youtube_v3.Schema$Video[] = JSON.parse(buffer.toString())
        await inference(videos, channelDir)
    }

    return channels
}

getChannels().catch(console.error)

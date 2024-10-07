import { iItem } from '../../app/src/utils/types'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(__dirname, '../ignore/data/youtube')

export const getAllVideos = async() => {
    // Get all channels
    const channels = readdirSync(DATA_DIR)
    const allVideos:iItem[] = []

    for (const channel of channels) {
        const channelDir = join(DATA_DIR, channel)
        const videosPath = join(channelDir, 'data.json')

        // Get all videos for each channel
        const buffer = readFileSync(videosPath)
        const videos:iItem[] = JSON.parse(buffer.toString())
        const channelVideos = videos.map(v => ({...v, category:channel}))
        allVideos.push(...channelVideos)
    }

    return allVideos
}

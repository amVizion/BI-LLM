import { embeddedAnalysis } from '../../lib/analysis'
import { iEmbeddedText } from '../../lib/utils/types'
import { iItem } from '../../app/src/utils/types'

import { youtube_v3 } from '@googleapis/youtube'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'


// Iterate through channels/data directory
const DATA_DIR = './ignore/data/youtube'

const getChannels = async() => {
    const channels = readdirSync(DATA_DIR)
    const channelEmbeddings:iEmbeddedText[] = []

    // For each channel get the videos.json file
    for (const channel of channels) {
        const channelDir = join(DATA_DIR, channel)
        const videosPath = join(channelDir, 'data.json')
        const channelPath = join(channelDir, 'channel.json')

        const buffer = readFileSync(videosPath)
        const videos:iItem[] = JSON.parse(buffer.toString())

        const channelBuffer = readFileSync(channelPath)
        const channelData:youtube_v3.Schema$Channel = JSON.parse(channelBuffer.toString())

        // Sum embeddgins for all videos. Then average them by dimension.
        const embeddings = videos.map(({ embeddings }) => embeddings)
        const avgEmbeddings = embeddings[0].map((_, i) => {
            const sum = embeddings.reduce((acc, val) => acc + val[i], 0)
            return sum / embeddings.length
        })

        const avgViews = videos.reduce((acc, { output }) => acc + output, 0) / videos.length

        const channelName = channelData.snippet?.title
        if(!channelName) continue

        const item = { text: channelName, embeddings: avgEmbeddings, output: avgViews }
        channelEmbeddings.push(item)        
    }

    const outputPath = '../app/src/data/clusters'
    await embeddedAnalysis(channelEmbeddings, outputPath)
}

getChannels().catch(console.error)

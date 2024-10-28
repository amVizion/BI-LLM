import subscriptions from '../../solutions/ignore/data/youtube/Y Combinator/niche.json'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { iItem } from '../../app/src/utils/types'
import { youtube_v3 } from '@googleapis/youtube'
import path from 'path'

import ajectivePredictor from '../../data/attributeStore/adjectives/predictor.json'
import emotionPredictor from '../../data/attributeStore/emotions/predictor.json'
import topicPredictor from '../../data/attributeStore/topics/predictor.json'

import adjectiveLabels from '../../data/attributeStore/adjectives/labels.json'
import emotionLabels from '../../data/attributeStore/emotions/labels.json'
import topicLabels from '../../data/attributeStore/topics/labels.json'
import { clusterTexts } from '../pipelines/2.SPC'
import { cdvPipeline } from '../pipelines/3.CDV'
import { getReport } from '../reflexion/report'
import { iConfig } from '../pipelines'


// For a given list of videos. Retrieve the ones with the hightest score by attribute.
const THRESHOLD_IDX = 1000

const filterByAttribute = (videos:iItem[], selectedVideos:iItem[], attribute:string) => {
    const filteredVideos = videos.filter(video => {
        const label = video.labels.find(({ label }) => label === attribute)
        if(!label) return false
        return label.score
    })

    selectedVideos.push(...filteredVideos)
    selectedVideos.sort((a, b) => 
        b.labels.find(({ label }) => label === attribute)!.score 
        - a.labels.find(({ label }) => label === attribute)!.score
    )

    return selectedVideos
}

export const getDistance = (point:number[], center:number[]) => {
    return Math.sqrt(point.reduce((acc, val, i) => {
        return acc + Math.pow(val - center[i], 2)
    }, 0))
}


const filterByDistance = (videos:iItem[], selectedVideos:iItem[], center:number[]) => {
    selectedVideos.push(...videos)
    selectedVideos.sort((a, b) => 
        getDistance(b.embeddings, center) - getDistance(a.embeddings, center)
    )

    return selectedVideos
}

export const VIDEO_DIR = path.join(__dirname, '../../solutions/ignore/data/youtube')
export const getChannelNames = () => {
    // Filter subscriptions with count > 5
    const filteredSubs = subscriptions.filter(sub => sub.count > 5)
    const channelIds = filteredSubs.map(sub => sub.channelId)

    // Get all channels
    const channelDirs = readdirSync(VIDEO_DIR)

    const channelNames = []

    // For channel in channels. Read channels.json
    for (const channel of channelDirs) {
        const channelDir = path.join(VIDEO_DIR, channel)
        const channelBuffer = readFileSync(`${channelDir}/channel.json`)
        const channelJSON:youtube_v3.Schema$Channel = JSON.parse(channelBuffer.toString())

        const { id, snippet } = channelJSON
        if(!id || !snippet?.title) continue

        // If channel in channelIds. Add to selectedChannels
        if (channelIds.includes(id)) channelNames.push(snippet.title)
    }

    return channelNames
}

interface iRetrieve { attribute?:string, center?:number[] }
export const retrieve = ({ attribute, center }:iRetrieve) => {
    const channelNames = getChannelNames()

    let selectedVideos:iItem[] = []

    // For selectedChannels. Get all videos
    for (const channelName of channelNames) {
        const channelDir = path.join(VIDEO_DIR, channelName)
        try{
            const videoBuffer = readFileSync(`${channelDir}/data.json`)
            const videoJSON:iItem[] = JSON.parse(videoBuffer.toString())
    
            if(attribute) filterByAttribute(videoJSON, selectedVideos, attribute)
            if(center) filterByDistance(videoJSON, selectedVideos, center)
        } catch(e) { }

        selectedVideos = selectedVideos.filter((_, i) => i < THRESHOLD_IDX)
    }

    return selectedVideos
}


export const analysis = async(videos:iItem[], dirName:string, center:number[]) => {
    const dir = path.join(__dirname, `ignore/${dirName}`)
    if(!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}/data.json`, JSON.stringify(videos))


    const verticals = [ 'emotions', 'topics', 'adjectives' ]
    const config:iConfig = { verticals, outputPath: dir }

    const { clusteredTexts, clusters } = await clusterTexts(videos, config)
    const reportInputs = await cdvPipeline(clusteredTexts, clusters, config)

    const report = await getReport({...reportInputs, dir})

    writeFileSync(`${dir}/report.txt`, JSON.stringify(report, null, 2))
    writeFileSync(`${dir}/center.json`, JSON.stringify(center, null, 2))
}

export const getAllAttributes = () => {
    const adjectiveCenters = adjectiveLabels.map((label, i) => {
        const center = ajectivePredictor.weights.map(w => w[i])
        return { label, center }
    })

    const emotionCenters = emotionLabels.map((label, i) => {
        const center = emotionPredictor.weights.map(w => w[i])
        return { label, center }
    })

    const topicCenters = topicLabels.map((label, i) => {
        const center = topicPredictor.weights.map(w => w[i])
        return { label, center }
    })

    const allAttributes = [
        ...adjectiveCenters, 
        ...emotionCenters, 
        ...topicCenters
    ]

    return allAttributes

}

export const explore = async() => {

    const allAttributes = getAllAttributes()
    const exploredPoints = [[0, 0, 0, 0, 0]] // TODO: Load existing centers.
    const explorationLimit = 10

    const findMinDistance = (points:number[][], center:number[]) => {
        let minDistance = Infinity
        for (const point of points) {
            const distance = Math.sqrt(point.reduce((acc, val, i) => {
                return acc + Math.pow(val - center[i], 2)
            }, 0))

            if(distance < minDistance) minDistance = distance
        }

        return minDistance
    }

    for (let i = 0; i < explorationLimit; i++) {
        const { attribute } = allAttributes.reduce((acc, attribute) => {
            const distance = findMinDistance(exploredPoints, attribute.center)
            if(distance > acc.distance) return { attribute, distance }
            return acc
        }, { attribute: allAttributes[0], distance: 0 })

        exploredPoints.push(attribute.center)
        const selectedVideos = retrieve({attribute: attribute.label})
        await analysis(selectedVideos, attribute.label, attribute.center)
    }
}

export const attributeAnalysis = async() => {
    const attributes = getAllAttributes()

    for (const attribute of attributes) {
        console.log(`Analyzing ${attribute.label}`)

        // Check if attribute directory exists
        const dir = path.join(__dirname, `ignore/${attribute.label}`)
        if(existsSync(dir)) continue

        // Else, perform the analysis
        const selectedVideos = retrieve({attribute: attribute.label})
        await analysis(selectedVideos, attribute.label, attribute.center)
    }
}

// explore().catch(console.error)
// attributeAnalysis().catch(console.error)


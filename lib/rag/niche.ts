import { analysis, getChannelNames, getDistance, retrieve, VIDEO_DIR } from './retrieve'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { kMeansCluster } from 'simple-statistics'
import { iItem } from '../../app/src/utils/types'
import { iEmbeddedText } from '../utils/types'
import path from 'path'
import { youtube_v3 } from '@googleapis/youtube'


const getAllEmbeddings = (hasOutputs=false) => {
    const embeddings = []
    const channelNames = getChannelNames()
    for (const channelName of channelNames) {
        const channelDir = path.join(VIDEO_DIR, channelName)
        try{
            const videoBuffer = readFileSync(`${channelDir}/data.json`)
            const videoJSON:iItem[] = JSON.parse(videoBuffer.toString())
            if(!hasOutputs) embeddings.push(...videoJSON.map(v => v.embeddings))
            else embeddings.push(...videoJSON.map(v => ({
                embeddings: v.embeddings, 
                output: v.output
            })))
    
        } catch(e) { console.error(channelName) }
    }

    return embeddings
}

export const getCorrelation = (a:number[], b:number[]) => {
    const meanA = a.reduce((acc, cur) => acc + cur, 0) / a.length
    const meanB = b.reduce((acc, cur) => acc + cur, 0) / b.length
    const cov = a.reduce((acc, cur, i) => acc + (cur - meanA) * (b[i] - meanB), 0)
    const stdA = Math.sqrt(a.reduce((acc, cur) => acc + Math.pow(cur - meanA, 2), 0))
    const stdB = Math.sqrt(b.reduce((acc, cur) => acc + Math.pow(cur - meanB, 2), 0))
    return cov / (stdA * stdB)
}

export const getClusterCenters = () => {
    const clustersDir = path.join(__dirname, './ignore')

    return readdirSync(clustersDir)
    .filter(f => f.includes('cluster#'))
    .map(dir => {
        const centerBuffer = readFileSync(`${clustersDir}/${dir}/center.json`)
        const center:number[] = JSON.parse(centerBuffer.toString())
        return center        
    })
}


const getChannelStats = () => {
    const channelNames = getChannelNames()
    const centers = getClusterCenters()
    const stats = []
    for (const channelName of channelNames) {
        const channelDir = path.join(VIDEO_DIR, channelName)
        try{
            const itemsBuffer = readFileSync(`${channelDir}/data.json`)
            const items:iItem[] = JSON.parse(itemsBuffer.toString())
            const averageOutput = items.reduce((acc, { output }) => acc + output, 0) / items.length

            const distances = centers.map(center => {
                const embeddings = items.map(v => v.embeddings).map(e => getDistance(e, center))
                const avgDistance = embeddings.reduce((acc, cur) => acc + cur, 0) / embeddings.length
                return avgDistance
            })
            const minDistance = Math.min(...distances)
            const closestCluster = distances.indexOf(minDistance)

            const clusterCounter = items.reduce((acc, { embeddings }) => {
                const distances = centers.map(center => getDistance(embeddings, center))
                const minDistance = Math.min(...distances)
                const cluster = distances.indexOf(minDistance)
                acc[cluster] = acc[cluster] ? acc[cluster] + 1 : 1
                return acc
            }, {} as {[key:number]:number})

            console.log(clusterCounter)

            const mostCommonCluster = Object.keys(clusterCounter)
            .reduce((acc, cur) => clusterCounter[Number(cur)] > (clusterCounter[Number(acc)] || 0) ? cur : acc, '0')

            // If Most Common cluster is duplicated, get the closest cluster
            const clusterFrequency = clusterCounter[Number(mostCommonCluster)]
            console.log(mostCommonCluster, clusterFrequency)

            const clusterFrequencyCount = Object.values(clusterCounter).filter((v, i) => i === clusterFrequency)
            if(clusterFrequencyCount.length > 1) console.log(channelName, clusterCounter)

            const videosBuffer = readFileSync(`${channelDir}/videos.json`)
            const videos:youtube_v3.Schema$Video[] = JSON.parse(videosBuffer.toString())

            const dates = videos.map(v => ({
                date: v.snippet?.publishedAt,
                views: Number(v.statistics?.viewCount)
            })).filter(d => d.date && d.views) as { date:string, views:number }[]

            const sortDates = dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            const trend = getCorrelation(sortDates.map(d => d.views), sortDates.map((d, i) => i))
            
            stats.push({ 
                channelName, 
                averageOutput, 
                minDistance, 
                closestCluster, 
                mostCommonCluster,
                trend
            })

        } catch(e) { console.error(channelName) }
    }

    return stats
}

const clusterClassification = async () => {
    // Get all video embeddings
    const embeddings = getAllEmbeddings() as number[][]

    // Cluster the embeddings
    const { centroids, labels } = kMeansCluster(embeddings, 20)
    const clusters = []

    // Hierarchical clustering
    for (const idx in centroids) {
        const points = embeddings.filter((e, i) => Number(idx) === labels[i])
        const { centroids:subCentroids } = kMeansCluster(points, 5)
        clusters.push({ center: centroids[idx], subCentroids, size: points.length })
        console.log(`Cluster ${idx} has ${points.length} points`)
    }

    // Make reports for the clusters
    for (const i in clusters) {
        const { subCentroids, center } = clusters[i]
        const videos = retrieve({ center })
        await analysis(videos, `cluster#${i}`, center)

        for (const idx in subCentroids) {
            continue
            const videos = retrieve({ center: subCentroids[idx] })
            await analysis(videos, `cluster-${i}-${idx}`, subCentroids[idx])
        }
    }

    // Summarize clusters
}

const clusterAnalysis = async() => {
    const items = getAllEmbeddings(true) as iEmbeddedText[]

    // Load clusters
    const centers = getClusterCenters()

    const getDistance = (a:number[], b:number[]) => {
        return a.reduce((acc, cur, i) => acc + Math.pow(cur - b[i], 2), 0)
    }

    const clusteredItems = items.map(t => {
        // Find the closest cluster
        const distances = centers.map(center => getDistance(t.embeddings, center))
        const minDistance = Math.min(...distances)
        const clusterIdx = distances.indexOf(minDistance)
        return { ...t, cluster: clusterIdx }
    })

    const clusters = centers.map((center, idx) => {
        const items = clusteredItems.filter(i => i.cluster === idx)
        const size = items.length
        const average = items.reduce((acc, cur) => acc + cur.output, 0) / size
        return { idx, size, average, center }
    })

    writeFileSync(
        path.join(__dirname, 'clusters.json'), 
        JSON.stringify(clusters)
    )
}

const clusterAnalysisByCluster = async() => {
    const stats = getChannelStats()
    const centers = getClusterCenters()

    const clusters = centers.map((center, idx) => {
        const items = stats.filter(s => s.mostCommonCluster === idx.toString())
        const size = items.length
        const average = items.reduce((acc, cur) => acc + cur.averageOutput, 0) / size
        const trend = items.reduce((acc, cur) => acc + cur.trend, 0) / size
        return { idx, size, average, center, trend }
    })

    writeFileSync(
        path.join(__dirname, 'clusters-by-channel.json'), 
        JSON.stringify(clusters)
    )

    writeFileSync(
        path.join(__dirname, 'channel-stats.json'), 
        JSON.stringify(stats)
    )
}



// nicheAnalysis().catch(console.error)
// clusterAnalysis().catch(console.error)
// clusterAnalysisByCluster().catch(console.error)

const growthAnalysis = () => {
    // Get all channels for the cluster and subcluster

    // Rank channels by average views

    // Measure growth rate for each channel

    // Measure growth by cluster and subcluster

    // Measure distance from channel center to clusters, and subclusters center

    // Make suggestions of potential niches

    // Channel niches
        // Cluster videos for channel
        // Measure channel clusters to niche subclusters
        // Identify how concentrated channel content
        // Log results to integrate findings into the analysis.
}


const channelAnalysis = () => {
    // Get representative video for the channel

    // Get channel clusters

    // Get representative videos for the channel clusters

    // Enlist performing, and underperforming attributes

    // Make suggestions for channel content
}

import { getAllAttributes, getChannelNames, getDistance, VIDEO_DIR } from './retrieve'
import { iCorrelation, iItem } from '../../app/src/utils/types'
import { getClusterCenters, getCorrelation } from './niche'
import { kMeansCluster } from 'simple-statistics'
import { youtube_v3 } from '@googleapis/youtube'
import { readFileSync, writeFileSync } from 'fs'
import { callOllama } from '../utils/ollama'
import path from 'path'


const getDescriptionPrompt = (topVideos:string[], description?:string) => `
Describe the channel's content, based on the top videos, and the channel introduction.

Channel introduction: ${description}

Top videos:
${topVideos.map(v => `• ${v}`).join('\n')}

Channel description:`

const getClusterDescription = (videos:string[]) => `
Describe the content of YouTube videos in a single word.
Then, provide a one-line description.
And end with alternative 1-word descriptions for the video's content.

YouTube videos:
${videos.map(v => `• ${v}`).join('\n')}`


const getThumbnail = (thumbnails?:youtube_v3.Schema$ThumbnailDetails) => {
    if(!thumbnails) return null

    if(thumbnails?.maxres) return thumbnails?.maxres?.url
    if(thumbnails?.high) return thumbnails?.high?.url
    if(thumbnails?.standard) return thumbnails?.standard?.url
    if(thumbnails?.medium) return thumbnails?.medium?.url
    if(thumbnails?.default) return thumbnails?.default?.url
    return null
}

interface iVideo { item:iItem, video:youtube_v3.Schema$Video, date:Date }
const rankVideos = (videos:iVideo[], center:number[]) => {
    const maxDistance = Math.max(...videos.map(v => getDistance(v.item.embeddings, center)))
    const maxViews = Math.max(...videos.map(v => Number(v.video.statistics?.viewCount)))
    const minAge = new Date(Math.min(...videos.map(v => Number(v?.date))))

    const rankedVideos =  videos.map(v => {
        // Recency (newest is one, oldest is zero).
        const age = new Date(v!.date)
        const recency = 1 - (new Date().getTime() - age.getTime()) / (new Date().getTime() - minAge.getTime())

        // Centrality (closest is one, farthest is cero).
        const distance = getDistance(v.item.embeddings, center)
        const centrality = 1 - (distance / maxDistance)

        // Popularity (most viewed is one, least viewed is zero). Use logs
        const popularity = Math.log(Number(v.video.statistics?.viewCount) + 1) / Math.log(maxViews + 1)
        const ranking = recency * centrality * popularity

        const metrics = { recency, centrality, popularity }
        const rawMetrics = { ranking, age, distance }
        return { ...v, ranking, metrics, rawMetrics }
    })

    // TODO: Parametrize number of videos. Maybe rename function.
    const topVideos = [...rankedVideos].sort((a, b) => b.ranking - a.ranking).slice(0, 12).map(v => {
        const date = v.date
        const title = v.video!.snippet?.title || ''
        const views = v.video!.statistics?.viewCount
        const thumbnail = getThumbnail(v.video!.snippet?.thumbnails)

        return { date, title, views, thumbnail, metrics:v.metrics, rawMetrics: v.rawMetrics }
    })

    return topVideos
}


const mergeVideos = (channelDir:string):iVideo[] => {
    const videosBuffer = readFileSync(`${channelDir}/videos.json`)
    const videosJSON:youtube_v3.Schema$Video[] = JSON.parse(videosBuffer.toString())

    const itemsBuffer = readFileSync(`${channelDir}/data.json`)
    const items:iItem[] = JSON.parse(itemsBuffer.toString())

    return items.map(item => {
        const video = videosJSON.find(v => v.snippet?.title === item.text)
        if(!video || !video.snippet) return null
        const { publishedAt } = video?.snippet

        // If publishedAt is not string, discard video.
        if(typeof publishedAt !== 'string') return null

        const date = new Date(video?.snippet?.publishedAt!)
        return { item, video, date }
    }).filter(v => v) as iVideo[]
}

const measureCentrality = (videos:iVideo[], channelCenter:number[]) => {
    const clusters = getClusterCenters()
    const labeledVideos = videos.map(v => {
        const distances = clusters.map(center => getDistance(v.item.embeddings, center))
        const minDistance = Math.min(...distances)
        const cluster = distances.indexOf(minDistance)
        return { ...v, cluster }
    })

    const clusterFrequency = clusters.map((_, i) => {
        const clusterVideos = labeledVideos.filter(v => v.cluster === i)
        const frequency = clusterVideos.length
        return {cluster:i, frequency}
    })

    const mostFrequent = clusterFrequency.sort((a, b) => b.frequency - a.frequency)[0]
    const centrality = mostFrequent.frequency / labeledVideos.length

    const distances = videos.map(v => getDistance(v.item.embeddings, channelCenter))
    const avgDistance = distances.reduce((acc, val) => acc + val, 0) / distances.length
    const sdDistance = Math.sqrt(
        distances.reduce((acc, val) => acc + Math.pow(val - avgDistance, 2), 0) / distances.length
    )

    const last100 = distances.slice(-100).reduce((acc, val) => acc + val, 0)/100
    const topFrequency = clusterFrequency.sort((a, b) => b.frequency - a.frequency).slice(0, 6)

    // TODO: Implement 
    const centralityMetrics = { centrality, last100, avgDistance, sdDistance, topFrequency, mostFrequent }
    return centralityMetrics
}

const measureTrends = (videos:iVideo[]) => {
    const orderedVideos = [...videos].sort((a, b) => Number(a.date) - Number(b.date))
    const dates = orderedVideos.map(v => Number(v.date))
    const views = orderedVideos.map(v => Number(v.video.statistics?.viewCount))
    const logViews = views.map(v => Math.log(v + 1))
    const topVideos = [...orderedVideos.map((v, i, l) => ({...v, rank:i/l.length}))].sort((a, b) => 
        Number(b.video.statistics?.viewCount) - Number(a.video.statistics?.viewCount)
    ).slice(0, 12).map(v => ({ title:v.video.snippet?.title, dateRank:v.rank, views:v.video.statistics?.viewCount }))
    
    const trend = getCorrelation(dates, views)
    const logTrend = getCorrelation(dates, logViews)
    const topVideosRank = topVideos.reduce((acc, v) => acc + v.dateRank, 0) / topVideos.length

    const trendMetrics = { trend, logTrend, topVideosRank, topVideos, x:dates, y:views }
    return trendMetrics
}

const channelBenchmark = () => {
    // Get all channels
    const channelNames = getChannelNames()
    const channels = []

    for (const channelName of channelNames) {
        try{
            const channelDir = path.join(VIDEO_DIR, channelName)
            const videos = mergeVideos(channelDir)
    
            const { centroids } = kMeansCluster(videos.map(v => v.item.embeddings), 1)
            const channelCenter = centroids[0]
        
            // Get centrality && get trends
            const centralityMetrics = measureCentrality(videos, channelCenter)
            const trendMetrics = measureTrends(videos)
    
            const avgOutput = videos.reduce((acc, val) => acc + val.item.output, 0) / videos.length
            const cluster = centralityMetrics.mostFrequent.cluster
    
            channels.push({ channelName, centralityMetrics, trendMetrics, avgOutput, cluster })    
        } catch(e) {}
    }

    // Average centrality & trend metrics.
    const avgCentrality = channels.reduce((acc, val) => acc + val.centralityMetrics.centrality, 0) / channels.length
    const avgLast100 = channels.reduce((acc, val) => acc + val.centralityMetrics.last100, 0) / channels.length
    const avgAvgDistance = channels.reduce((acc, val) => acc + val.centralityMetrics.avgDistance, 0) / channels.length
    const avgSdDistance = channels.reduce((acc, val) => acc + val.centralityMetrics.sdDistance, 0) / channels.length

    const avgTopVideosRank = channels.reduce((acc, val) => acc + val.trendMetrics.topVideosRank, 0) / channels.length
    const avgTrend = channels.reduce((acc, val) => acc + val.trendMetrics.trend, 0) / channels.length
    const avgLogTrend = channels.reduce((acc, val) => acc + val.trendMetrics.logTrend, 0) / channels.length

    const benchmark = { 
        centrality: avgCentrality, 
        last100: avgLast100, 
        avgDistance: avgAvgDistance, 
        sdDistance: avgSdDistance, 
        topVideosRank: avgTopVideosRank, 
        trend: avgTrend,
        logTrend: avgLogTrend
    }

    return {benchmark, channels}
}

const autoReport = async(channelName:string) => {
    // Content overview:
    const slides = []
    const channelDir = path.join(VIDEO_DIR, channelName)

    const channelBuffer = readFileSync(`${channelDir}/channel.json`)
    const channel:youtube_v3.Schema$Channel = JSON.parse(channelBuffer.toString())
    const channelDescription = channel.snippet?.description  || ''

    // Get channel videos
    const videos = mergeVideos(channelDir) as iVideo[]

    const ytStats = {
        subscribers: channel.statistics?.subscriberCount,
        views: channel.statistics?.viewCount,
        videos: channel.statistics?.videoCount,
        comments: channel.statistics?.commentCount,
    }

    const views = videos.reduce((acc, val) => 
        acc + Number(val.video.statistics?.viewCount)
    , 0)

    // 0. Intro slide
    const slideZero = {
        thumbnail: getThumbnail(channel.snippet?.thumbnails),
        description: channelDescription,
        title: channel.snippet?.title,
        id: channel.id,
        handle: channel.snippet?.customUrl,
        ytStats,
        videoStats:{
            views,
            videos: videos.length,
            avgViews: views / videos.length
        }
    }
    slides.push(slideZero)
    console.log('Slide 0', slideZero)


    const { centroids } = kMeansCluster(videos.map(v => v.item.embeddings), 1)
    const channelCenter = centroids[0]

    // 1. Central video to introduce the channel.
    const getSlideOne = async() => {
        // Composite formula: recency, centrality, and popularity.
        const topVideos = rankVideos(videos, channelCenter)

        // Get thumbnail, and describe channel in one-liner.

        const descriptionPrompt = getDescriptionPrompt(topVideos.map(v => v.title), channelDescription)
        const ollamaDescription = await callOllama(descriptionPrompt)

        const slide = { topVideos, channelSummary: ollamaDescription }

        return slide
    }

    const slideOne = await getSlideOne()
    console.log('Slide 1', slideOne)
    slides.push(slideOne)

    // 2. Other representative videos:
    const getSlideTwo = async() => {
        const channelClusters = kMeansCluster(videos.map(v => v.item.embeddings), 4)
        const clusteredVideos = videos.map((v, i) => ({ ...v, cluster: channelClusters.labels[i] }))

        // For each cluster: rank videos (Get representative video, and title from the cluster).
        const clusterTopVideos = channelClusters.centroids.map((center, i) => {
            const clusterVideos = clusteredVideos.filter(v => v.cluster === i)
            const topVideos = rankVideos(clusterVideos, center).slice(0, 12)
            return { topVideos, center }
        })

        const clusterDescriptions = []

        // Attribute to describe cluster.
        for(const cluster of clusterTopVideos) {
            const descriptionPrompt = getClusterDescription(cluster.topVideos.map(v => v.title))
            const ollamaDescription = await callOllama(descriptionPrompt)
            const clusterDescription = { description: ollamaDescription, topVideos: cluster.topVideos }
            clusterDescriptions.push(clusterDescription)
        }

        return clusterDescriptions
    }

    const slideTwo = await getSlideTwo()
    console.log('Slide 2', slideTwo)
    slides.push(slideTwo)

    // 3. Attribute comparisson:
    const getSlideThreeAndFour = async() => {
        const attributes = getAllAttributes()
        const correlationsBuffer = readFileSync(`${channelDir}/correlations.json`)
        const correlationsJSON:iCorrelation[] = JSON.parse(correlationsBuffer.toString())

        interface iCenteredCorrelation extends iCorrelation { center:number[], prominence:number }
        const correlations:iCenteredCorrelation[] = correlationsJSON.map(c => ({ ...c,
            prominence: c.mean * c.rho, 
            center: attributes.find(a => a.label === c.label)!.center 
        }))

        // For each attribute get most common, better rho, and most prominent.
        const mostCommon = correlations.sort((a, b) => b.mean - a.mean).slice(0, 10)
        const betterRho = correlations.sort((a, b) => b.rho - a.rho).slice(0, 10)
        const moreProminence = correlations.sort((a, b) => b.prominence - a.prominence).slice(0, 12)

        const leastCommon = correlations.sort((a, b) => a.mean - b.mean).slice(0, 10)
        const worstRho = correlations.sort((a, b) => a.rho - b.rho).slice(0, 10)
        const leastProminent = correlations.sort((a, b) => a.prominence - b.prominence).slice(0, 12)

        const overPerformClusters = kMeansCluster(moreProminence.map(c => c.center), 5)
        const underPerformClusters = kMeansCluster(leastProminent.map(c => c.center), 5)

        const overPerform = overPerformClusters.centroids.map((_, i) =>
            moreProminence.filter((_, j) => overPerformClusters.labels[j] === i)
            .map(c => ({ label:c.label, prominence:c.prominence }))
        )
        const underPerform = underPerformClusters.centroids.map((_, i) =>
            leastProminent.filter((_, j) => underPerformClusters.labels[j] === i)
            .map(c => ({ label:c.label, prominence:c.prominence }))
        )

        // Over-perform & under-perform: group by similarity.
        const positiveCorrelations = { mostCommon, betterRho, moreProminence }
        const negativeCorrelations = { leastCommon, worstRho, leastProminent }
        const slideThree = { overPerform, underPerform, positiveCorrelations, negativeCorrelations }

        // 4. Content insights: contrastive analysis.

        // Largest deltas: for most prominent - show lowest prominence by proximity.
        const getDelta = (a:iCenteredCorrelation, b:iCenteredCorrelation) => {
            const distance = getDistance(a.center, b.center)
            const diff = Math.abs(a.prominence - b.prominence)
            const delta = diff / distance
            return { attributes:[a, b], delta, diff, distance }
        } // The closest the attributes, the largest the delta.

        const deltas = moreProminence.map(a =>
            correlations.map(b => getDelta(a, b))
        ).flat().sort((a, b) => b.delta - a.delta).slice(0, 12)

        // Under-explored attributes: for most prominent - get closest with highest rho
        const getUnderExplored = (a:iCenteredCorrelation, b:iCenteredCorrelation) => {
            const distance = getDistance(a.center, b.center) || Infinity
            const opportunity = b.rho/distance
            return { prominent:a, underExplored:b, opportunity }
        } // TODO: Factor the rho/prominence of leading attribute.

        const underExplored = moreProminence.map(a =>
            correlations.map(b => getUnderExplored(a, b))
        ).flat().sort((a, b) => b.opportunity - a.opportunity).slice(0, 12)

        // Antagonistic: shift from farthest with highest prominence.
        const getShift = (a:iCenteredCorrelation, b:iCenteredCorrelation) => {
            const distance = getDistance(a.center, b.center)
            const shift = b.prominence*distance
            return { antagonistic:a, leading:b, distance, shift }
        } // The largest the distance the better.

        const antagonistic = leastProminent.map(a => 
            correlations.map(b => getShift(a, b))
        ).flat().sort((a, b) => b.shift - a.shift).slice(0, 12)

        const slideFour = { deltas, underExplored, antagonistic }        
        return { slideThree, slideFour }
    }

    const { slideThree, slideFour } = await getSlideThreeAndFour()
    slides.push(slideThree, slideFour)

    // 5. Trend & centrality analysis:
    const getSlideFive = () => {
        // Trends: correlation, logCorrelation & topVideos
        const centralityMetrics = measureCentrality(videos, channelCenter)
        const trendMetrics = measureTrends(videos)
        const slideFive =  { centralityMetrics, trendMetrics }
        return slideFive

    }

    const slideFive = getSlideFive()
    console.log('Slide 5', slideFive)

    // 6. Global benchamrk (later by cluster). TODO: Add Charts.
    const {benchmark, channels} = channelBenchmark()
    console.log('Benchmark', benchmark)


    slides.push(slideFive, benchmark)

    // 7. Section 1 observations (manually). TODO: Design ollama prompts.

    // Niche analysis. Cluster description.
    const mostFrequent = slideFive.centralityMetrics.mostFrequent.cluster
    const clusterFile = `cluster#${mostFrequent}/reportObj.json`
    const DATA_DIR = path.join(__dirname, 'ignore')
    const clusterBuffer = readFileSync(`${DATA_DIR}/${clusterFile}`)
    const clusterJSON = JSON.parse(clusterBuffer.toString())
    slides.push(clusterJSON)

    // Leadership position. Cluster leaders:
    const nicheChannels = channels.filter(c => c.cluster === mostFrequent)
    const leaderboard = [...nicheChannels].sort((a, b) => b.avgOutput - a.avgOutput)
    const nichePosition = leaderboard.findIndex(c => c.channelName === channelName)
    const trend = nicheChannels.reduce((acc, val) => acc + val.trendMetrics.trend, 0) / nicheChannels.length
    const clusterAvgOutput = nicheChannels.reduce((acc, val) => acc + val.avgOutput, 0) / nicheChannels.length
    const slideSeven = { nichePosition, leaderboard, trend, clusterAvgOutput }
    console.log('Slide 7', slideSeven)
    slides.push(slideSeven)

    // 9. Other clusters. Growth opportunities:
    const otherClusters = slideFive.centralityMetrics.topFrequency.slice(1, 5)
    const otherClusterStats = otherClusters.map(cluster => {
        const nicheChannels = channels.filter(c => c.cluster === cluster.cluster)
        const leaderboard = [...nicheChannels].sort((a, b) => b.avgOutput - a.avgOutput)
        const nichePosition = leaderboard.findIndex(c => c.channelName === channelName)
        const trend = nicheChannels.reduce((acc, val) => acc + val.trendMetrics.trend, 0) / nicheChannels.length
        const clusterAvgOutput = nicheChannels.reduce((acc, val) => acc + val.avgOutput, 0) / nicheChannels.length
        return { nichePosition, leaderboard, trend, clusterAvgOutput }
    })

    console.log('Slide 9', otherClusterStats)
    slides.push(otherClusterStats)
   // 12. Channel vision. TODO: Design prompts.

   writeFileSync('slides.json', JSON.stringify(slides, null, 2))
   return slides 
} // Missing comments, short content & thumbnail analysis.

autoReport('Y Combinator').catch(console.error)

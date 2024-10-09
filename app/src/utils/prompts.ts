import { iFullCorrelation, tVerticalCorrelations, iItem, iCluster, iCorrelation, tScore } from './types'
import { kMeansCluster } from 'simple-statistics'
import data from '../data/data.json'
import axios from 'axios'

export const API_URL = 'http://localhost:3000'

type tStat = 'rho' | 'mean' | 'sd' | 'prominence'

export const getQuartile = (data:number[]) => {
    const sorted = data.sort((a, b) => a - b)
    const q1 = sorted[Math.floor(sorted.length / 4)]
    const q2 = sorted[Math.floor(sorted.length / 2)]
    const q3 = sorted[Math.floor(sorted.length * 3 / 4)]
    return { q1, q2, q3 }
}


interface iOrderAttributes { sortKey:tStat, inverse?:boolean, correlations:tVerticalCorrelations }
const orderAttributes = ({ sortKey, inverse, correlations }: iOrderAttributes) => Object.keys(correlations)
.reduce((acc, key) => {
    const sortOrder = inverse ? 1 : -1
    acc[key] = [...correlations[key]]
    .sort((a, b) => a[sortKey] > b[sortKey] ? sortOrder : -sortOrder)

    return acc
}, {} as {[key:string]:iFullCorrelation[]})


export const getReport = (verticalCorrelations:tVerticalCorrelations) => {
    const attributes = orderAttributes({sortKey: 'mean', correlations: verticalCorrelations})
    const correlation = orderAttributes({sortKey: 'prominence', correlations: verticalCorrelations})

    const decorrelationInput = {sortKey:'prominence' as const, inverse:true, correlations:verticalCorrelations}
    const decorrelation = orderAttributes(decorrelationInput)

    const outputs = data.map(({ output }) => output)
    const { q1, q2, q3 } = getQuartile(outputs)

    return `Generate a brief analysis of the performance of a YouTube channel.

The attributes that are most frequent in the content are 
- Emotions: ${attributes['emotions'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Topics: ${attributes['topics'].filter((_, i) => i < 5).map(({ label }) => label).join(', ')}
- Adjectives: ${attributes['adjectives'].filter((_, i) => i < 7).map(({ label }) => label).join(', ')}

The attributes that contribute the most to a good performance are:
- Emotions: ${correlation['emotions'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Topics: ${correlation['topics'].filter((_, i) => i < 4).map(({ label }) => label).join(', ')}
- Adjectives: ${correlation['adjectives'].filter((_, i) => i < 5).map(({ label }) => label).join(', ')}

While the attributes that contribute the most to a bad performance are:
- Emotions: ${decorrelation['emotions'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Topics: ${decorrelation['topics'].filter((_, i) => i < 4).map(({ label }) => label).join(', ')}
- Adjectives: ${decorrelation['adjectives'].filter((_, i) => i < 5).map(({ label }) => label).join(', ')}

The median number of views is ${q2}. 
While the top quartile is at ${q3} and the bottom quartile at ${q1} views.`
}

const instructionsPrompt = (task:string) => `You are a data analyst studying the performance of a YouTube channel.
Your task is to write a paragraph that ${task}.
`

// Top attributes by mean score. Plus sample titles at the center of clusters.
export const getIntroductionPrompt = (correlations:iCorrelation[], texts:iItem[]) => {
    const attrs = correlations.sort((a, b) => b.mean - a.mean).slice(0, 10)

    const embeddings = texts.map(({ embeddings }) => embeddings)
    console.log('embeddings', embeddings)

    const { centroids } = kMeansCluster(embeddings, 5)
    console.log('centroids', centroids)

    // Get top text closest to each centroid.
    const closestTexts = centroids.map((c) => {
        const distances = embeddings.map(e => Math.sqrt(e.reduce((acc, v, j) => acc + Math.pow(v - c[j], 2), 0)))
        const minIndex = distances.indexOf(Math.min(...distances))
        return texts[minIndex].text
    })


    const task = "describes the channel's content."
    return `${instructionsPrompt(task)}

Main attributes:
${attrs.map(({ label }) => `${label}`).join(', ')}

Sample titles:
${closestTexts.map(t => `- ${t}`).join('\n')}

Introduction:
The YouTube channel content is about`
}

export const getTopAttributesPrompt = (correlations:iCorrelation[], texts:iItem[]) => { 
    const prominence = correlations.map(({ mean, rho, label }) => ({ label, prominence:mean * rho }))
    const sortedAttrs = prominence.sort((a, b) => b.prominence - a.prominence).slice(0, 10)

    // Get top 5 texts by output.
    const topTexts = texts.sort((a, b) => b.output - a.output).map(({ text }) => text).slice(0, 5)

    // Write prompt
    const task = "explains what drives engagement for the channel."
    return `${instructionsPrompt(task)}

Top performing attributes:
${sortedAttrs.map(({ label }) => `${label}`).join(', ')}

Top videos:
${topTexts.map(t => `- ${t}`).join('\n')}
` 
}

export const getWorstAttributesPrompt = (correlations:iCorrelation[], texts:iItem[]) => {
    const prominence = correlations.map(({ mean, rho, label }) => ({ label, prominence:mean * rho }))
    const sortedAttrs = prominence.sort((a, b) => a.prominence - b.prominence).slice(0, 10)

    // Get worst 5 texts by output.
    const worstTexts = texts.sort((a, b) => a.output - b.output).map(({ text }) => text).slice(0, 5)

    const task = "explains what does not drive performance."

    return `${instructionsPrompt(task)}

Worst performing attributes:
${sortedAttrs.map(({ label }) => `${label}`).join(', ')}

Worst videos:
${worstTexts.map(t => `- ${t}`).join('\n')}
`
}

export const getSummaryPrompt = (texts:iItem[]) => {
    // Get texts.
    const sortedTexts = texts.sort((a, b) => b.output - a.output).map(({ text }) => text)

    const task = "summarizes the content of the channel."
    return `${instructionsPrompt(task)}

Videos:
${sortedTexts.map(t => `- ${t}`).join('\n')}
`}

export const getAnalysisPrompt = (texts:iItem[]) => {
    // Order texts, ordered by output.
    const sortedTexts = texts.sort((a, b) => b.output - a.output)

    return `You are a data analyst studying the performance of a YouTube channel.
Your task is to explain what drives performance for the channel.
Next is a list of videos ordered by number of views.

After analyzing the data, set a vision for the channel going forward.

Videos:
${sortedTexts.map(({ text, output }) => `- ${text}: ${output} views`).join('\n')}
`}


export const getVerticalPrompt = (vertical:string, correlations:iCorrelation[]) => {
    // For the given vertical select the top attributes by mean, and prominence.
    const attrs = correlations.sort((a, b) => b.mean - a.mean).slice(0, 10)
    const prominence = correlations.map(({ mean, rho, label }) => ({ label, prominence:mean * rho }))
    const topAttrs = prominence.sort((a, b) => b.prominence - a.prominence).slice(0, 10)
    const worstAttrs = prominence.sort((a, b) => a.prominence - b.prominence).slice(0, 10)

    const task = `describes the content of the ${vertical} that drive engagement.`

    const quantity = {emotions: 3, topics:5, adjectives:7 }[vertical] || 5
    return `${instructionsPrompt(task)}

Most common ${vertical}: ${attrs.filter((_, i) => i < quantity).map(({ label }) => label).join(', ')}
Top performing ${vertical}: ${topAttrs.filter((_, i) => i < quantity).map(({ label }) => label).join(', ')}
Worst performing ${vertical}: ${worstAttrs.filter((_, i) => i < quantity).map(({ label }) => label).join(', ')}

Don't simply list the attributes, create a coherent narrative that creates understanding about the performance.
`}


export const getAttributePrompt = (attribute:string, texts:iItem[]) => {
    // For the given attribute select the top 10 texts with the highest value.
    const attributeTexts = texts.sort((a, b) => {
        const aVal = a.labels.find(({ label }) => label === attribute)?.score || 0
        const bVal = b.labels.find(({ label }) => label === attribute)?.score || 0
        return bVal - aVal
    }).slice(0, 10)

    // Get the median value of texts by output.
    const { q2 } = getQuartile(texts.map(({ output }) => output))

    const aboveMedian = attributeTexts.filter(({ output }) => output > q2)
    const belowMedian = attributeTexts.filter(({ output }) => output <= q2)

    const task = `explains how ${attribute} drives the performance of the channel.`
    return `${instructionsPrompt(task)}

Analyze how ${attribute} affects the performance of the channel. 
Consider whether videos with this attribute tend to perform above or below the median. 
Based on the provided titles, identify which other attributes contribute to a good or bad performance.

Videos above the median (${q2}):
${aboveMedian.map(({ text }) => `- ${text}`).join('\n')}

Videos below the median:
${belowMedian.map(({ text }) => `- ${text}`).join('\n')}
`}

export const getSimilarityPrompt = (text:iItem, texts:iItem[]) => {
    // Get Euclidean distance between text and all other texts.
    const distances = texts.map(({ embeddings }) => {
        const distance = Math.sqrt(embeddings.reduce((acc, v, i) => acc + Math.pow(v - text.embeddings[i], 2), 0))
        return distance
    })

    // Get the 10 closest texts.
    const closestTexts = distances.map((d, i) => ({ distance: d, text: texts[i] }))
    .sort((a, b) => a.distance - b.distance).slice(1, 11).map(({ text }) => text)

    // Get closest videos that performed better.
    const abovePerformance = closestTexts.filter(({ output }) => output > text.output)

    // Get closest videos that performed worse.
    const belowPerformance = closestTexts.filter(({ output }) => output <= text.output)

    const task = `explains the performance of a video related to similar videos.`
    const { q2 } = getQuartile(texts.map(({ output }) => output))

    return `${instructionsPrompt(task)}

Video title: 
${text.text}

Similar videos that performed better:
${abovePerformance.map(({ text }) => `- ${text}`).join('\n')}

Similar videos that performed worse:
${belowPerformance.map(({ text }) => `- ${text}`).join('\n')}

Your decision will determine if the channel should continue publishing similar videos.
And if so, how to optimize those videos to improve performance.
Else, what other types of videos should be considered.

The video had ${text.output} views, while the channel's median is ${q2} views.
`
}


export const getTopVideosPrompt = (texts:iItem[]) => {
    // Top 10 videos by output.
    const topTexts = texts.sort((a, b) => b.output - a.output).map(({ text }) => text).slice(0, 10)
    const task = "explains what top videos have in common."

    return `${instructionsPrompt(task)}

Top videos:
${topTexts.map(t => `- ${t}`).join('\n')}
`}

export const getWorstVideosPrompt = (texts:iItem[]) => {
    // Worst 10 videos by output.
    const worstTexts = texts.sort((a, b) => a.output - b.output).map(({ text }) => text).slice(0, 10)
    const task = "explains what worst performing videos have in common."

    return `${instructionsPrompt(task)}

Worst videos:
${worstTexts.map(t => `- ${t}`).join('\n')}
`
}

// ---------- CLUSTER PROMPTS --------------

export const getClusterDescriptionPrompt = (cluster:iCluster) => {
    // Get the most common cluster attributes by mean.
    const topAttrs = cluster.attributes.sort((a, b) => b.mean - a.mean).slice(0, 10)

    // Get the most differentiating attributes by deltaMean.
    const deltaAttrs = cluster.attributes.sort((a, b) => b.deltaMean - a.deltaMean).slice(0, 10)

    const task = `describes the content of the cluster.`

    return `${instructionsPrompt(task)}

Most common attributes: 
${topAttrs.map(({ label }) => `${label}`).join(', ')}

Most differentiating attributes with respect to the rest of the clusters:
${deltaAttrs.map(({ label }) => `${label}`).join(', ')}

Start by giving the cluster a name. Then, a one-line summary. 
Finally, a detailed description of the content of the cluster.
`}

export const getClusterPerformancePrompt = (cluster:iCluster) => {
    // Get the attributes with the highes causality.
    const highestCause = cluster.attributes.filter(({ deltaMean }) => deltaMean > 0)
    .sort((a, b) => b.causality - a.causality).slice(0, 10)

    // Get the attributes with the lowest causality.
    const lowestCause = cluster.attributes
    .filter(({ deltaMean }) => deltaMean > 0)
    .sort((a, b) => a.causality - b.causality).slice(0, 10)

    const task = `explains what drives performance for the cluster.`

    return `${instructionsPrompt(task)}

Attributes that drive performance positively:
${highestCause.map(({ label }) => `${label}`).join(', ')}

Attributes that drive performance negatively:
${lowestCause.map(({ label }) => `${label}`).join(', ')}

The cluster rank is ${cluster.rank} out of 5 total clusters (lower is better).
`
}

const getVideos = async(channel:string) => {
    const VIDEOS_API = `${API_URL}/videos/channel/${channel}`
    const { data } = await axios.get(VIDEOS_API)
    return data as iItem[]
}


const getDelta = (attr:tScore, correlations:iCorrelation[]) => {
    const { mean } = correlations.find(({ label }) => label === attr.label)!
    return attr.score - mean
}

const getCausality = (attr:tScore, correlations:iCorrelation[]) => {
    const delta = getDelta(attr, correlations)
    const { rho } = correlations.find(({ label }) => label === attr.label)!

    return delta * rho
}


// Includes attributes, and titles.
export const describeChannel = async(channel:iItem, correlations:iCorrelation[]) => {
    const videos = await getVideos(channel.text)

    // Get top attributes by mean.
    const attrs = channel.labels.sort((a, b) => b.score - a.score).slice(0, 10)


    // Get top attributes by delta mean 
    const deltaAttrs = channel.labels.sort((a, b) => 
        getDelta(b, correlations) - getDelta(a, correlations)
    ).slice(0, 10)

    const task = `describes the content of the channel.`

    return `${instructionsPrompt(task)}

Most common attributes:
${attrs.map(({ label }) => `${label}`).join(', ')}

Most differentiating attributes with respect to the rest of the channels:
${deltaAttrs.map(({ label }) => `${label}`).join(', ')}

Videos:
${videos.map(({ text }) => `- ${text}`).join('\n')}

Start by giving the channel a name. Then, a one-line summary. 
Finally, a detailed description of the content of the channel.
`}

export const channelPerformance = async(channel:iItem, correlations:iCorrelation[]) => {
    const videos = await getVideos(channel.text)

    const topVideos = videos.sort((a, b) => b.output - a.output).slice(0, 10)
    const worstVideos = videos.sort((a, b) => a.output - b.output).slice(0, 10)

    const positiveCausality = channel.labels.filter(label => getDelta(label, correlations) > 0).
        sort((a, b) => getCausality(b, correlations) - getCausality(a, correlations)).slice(0, 10)

    const negativeCausality = channel.labels.filter(label => getDelta(label, correlations) > 0)
    .sort((a, b) => getCausality(a, correlations) - getCausality(b, correlations)).slice(0, 10)

    const task = `explains what drives performance for the channel.`

    return `${instructionsPrompt(task)}

Attributes that drive performance positively:
${positiveCausality.map(({ label }) => `${label}`).join(', ')}

Attributes that drive performance negatively:
${negativeCausality.map(({ label }) => `${label}`).join(', ')}

Top videos:
${topVideos.map(({ text }) => `- ${text}`).join('\n')}

Worst videos:
${worstVideos.map(({ text }) => `- ${text}`).join('\n')}

The channel had average ${channel.output} views.
` // TODO: Add channels median.
}


export const describeAttribute = async(attribute:string, correlations:iCorrelation[]) => {
    // 1. Get videos with the highest score.
    const { data } = await axios.get(`${API_URL}/videos/attributes/${attribute}/description`)
    const { videos }:{ videos:iItem[] } = data

    // 2. Get the most common associated attributes.
    const means = correlations.map(c => {
        const scores = videos.map(({ labels }) => labels.find(({ label }) => label === c.label)!.score)
        const mean = scores.reduce((acc, v) => acc + v, 0) / scores.length
        return { label: c.label, mean }
    }).filter(({ label }) => label !== attribute)

    const topAttributes = means.sort((a, b) => b.mean - a.mean).slice(0, 10)


    // 3. Get the most differentiating attributes.
    const deltaMeans = means.map(({ label, mean }) => ({ label, 
        deltaMean: mean - correlations.find(c => c.label === label)!.mean 
    }))

    const topDelta = deltaMeans.sort((a, b) => b.deltaMean - a.deltaMean).slice(0, 10)

    const task = `explains the content associated with "${attribute}".`

    return `${instructionsPrompt(task)}

Most common attributes in videos with a high score of ${attribute}:
${topAttributes.map(({ label }) => `${label}`).join(', ')}

Attributes that increase their score on videos with a high score of ${attribute}:
${topDelta.map(({ label }) => `${label}`).join(', ')}

Videos with a high score of ${attribute}:
${videos.map(({ text }) => `- ${text}`).join('\n')}
`}
    
export const attributePerformance = async(attribute:string, correlations:iCorrelation[]) => {

    // 1. Get the videos highest scores in the top quartile, and bottom quartile.
    const { data } = await axios.get(`${API_URL}/videos/attributes/${attribute}/performance`)
    const { topVideos, bottomVideos }:{ topVideos:iItem[], bottomVideos:iItem[] } = data
    const { median, attrMedian }:{ median:number, attrMedian: number } = data

    // 2. Get the attributes most correlated with success.
    const topMeans = correlations.map(c => {
        const scores = topVideos.map(({ labels }) => labels.find(({ label }) => label === c.label)!.score)
        const mean = scores.reduce((acc, v) => acc + v, 0) / scores.length
        const deltaMean = mean - c.mean
        return { label: c.label, deltaMean }
    }).sort((a, b) => b.deltaMean - a.deltaMean).slice(0, 10)

    // 3. Get the attributes most correlated with bad performance.
    const bottomMeans = correlations.map(c => {
        const scores = bottomVideos.map(({ labels }) => labels.find(({ label }) => label === c.label)!.score)
        const mean = scores.reduce((acc, v) => acc + v, 0) / scores.length
        const deltaMean = mean - c.mean
        return { label: c.label, deltaMean }
    }).sort((a, b) => b.deltaMean - a.deltaMean).slice(0, 10)

    const task = `explains how ${attribute} drives performance.`

    return `${instructionsPrompt(task)}

Attributes that are common when "${attribute}" videos perform well:
${topMeans.map(({ label }) => `${label}`).join(', ')}

Attributes that are common when "${attribute}" videos perform poorly:
${bottomMeans.map(({ label }) => `${label}`).join(', ')}

Videos that perform well with a high score of ${attribute}:
${topVideos.map(({ text }) => `- ${text}`).join('\n')}

Videos that perform poorly with a high score of ${attribute}:
${bottomVideos.map(({ text }) => `- ${text}`).join('\n')}

The median number of views for videos of "${attribute}" is ${attrMedian}. 
While the median for all other videos is ${median} views.
Consider the difference in performance when analyzing the data.
Remember, as a data analyst, your job is to find the truth not be nice.
`}

export const attributeTopChannels = async(attribute:string, items:iItem[], correlations:iCorrelation[]) => {
    const sortedChannels = items.sort((a, b) =>  b.output - a.output)
    const topQuartileChannels = sortedChannels.slice(0, Math.floor(sortedChannels.length / 4))

    const channels = topQuartileChannels.sort((a, b) => {
        const aScore = a.labels.find(({ label }) => label === attribute)!.score
        const bScore = b.labels.find(({ label }) => label === attribute)!.score
        return bScore - aScore
    }).slice(0, 10).map(({ text }) => text)
    
    const { data }:{ data:iItem[][] } = await axios.post(`${API_URL}/videos/channels`, { channels })

    const videos = data.flat()
    const topAttrs = correlations.map(c => {
        const scores = videos.map(({ labels }) => labels.find(({ label }) => label === c.label)!.score)
        const mean = scores.reduce((acc, v) => acc + v, 0) / scores.length
        const deltaMean = mean - c.mean
        return { label: c.label, deltaMean }
    }).sort((a, b) => b.deltaMean - a.deltaMean).slice(0, 10)

    const bottomAttrs = correlations.map(c => {
        const scores = videos.map(({ labels }) => labels.find(({ label }) => label === c.label)!.score)
        const mean = scores.reduce((acc, v) => acc + v, 0) / scores.length
        const deltaMean = mean - c.mean
        return { label: c.label, deltaMean }
    }).sort((a, b) => a.deltaMean - b.deltaMean).slice(0, 10)

    const task = `explains what content drives performance for "${attribute}" based on the top channels.`

    const attrVideos = data.map(videos => {
        const sortedVideos = videos.sort((a, b) => 
            b.labels.find(({ label }) => label === attribute)!.score 
            - a.labels.find(({ label }) => label === attribute)!.score
        ).slice(0, 5)
        return sortedVideos
    })

    return `${instructionsPrompt(task)}

Attributes that are common on videos from top channels where "${attribute}" videos perform well:
${topAttrs.map(({ label }) => `${label}`).join(', ')}

Attributes that are less frequent on videos from top channels where "${attribute}" videos perform poorly:
${bottomAttrs.map(({ label }) => `${label}`).join(', ')}

Videos from top channels with high score for "${attribute}":
${attrVideos.map((videos, i) => `- ${channels[i]}: ${videos.map(({ text }) => `'${text}'`).join(', ')}`).join('\n\n')}
`}

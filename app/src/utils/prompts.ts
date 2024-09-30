import { iFullCorrelation, tVerticalCorrelations, iItem } from './types'
import { kMeansCluster } from 'simple-statistics'
import data from '../data/data.json'

type tStat = 'rho' | 'mean' | 'sd' | 'prominence'

const getQuartile = (data:number[]) => {
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
Your task is to write a paragraph that ${task}
Use a casual language, simplifying the informaton for the Social Media Manager.`

// Top attributes by mean score. Plus sample titles at the center of clusters.
export const getIntroductionPrompt = (verticalCorrelations:tVerticalCorrelations, texts:iItem[]) => {
    const attributes = orderAttributes({sortKey: 'mean', correlations: verticalCorrelations})
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

Sample titles:
${closestTexts.map(t => `- ${t}`).join('\n')}

Main attributes:
- Emotions: ${attributes['emotions'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Topics: ${attributes['topics'].filter((_, i) => i < 5).map(({ label }) => label).join(', ')}
- Adjectives: ${attributes['adjectives'].filter((_, i) => i < 7).map(({ label }) => label).join(', ')}


Introduction:
The YouTube channel content is about`
}

export const getTopAttributesPrompt = (verticalCorrelations:tVerticalCorrelations, texts:iItem[]) => { 
    const correlation = orderAttributes({sortKey: 'prominence', correlations: verticalCorrelations})

    // Get top 5 texts by output.
    const topTexts = texts.sort((a, b) => b.output - a.output).map(({ text }) => text).slice(0, 5)

    // Write prompt
    const task = "explains what drives engagement for the channel."
    return `${instructionsPrompt(task)}

Top performing attributes:
- Emotions: ${correlation['emotions'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Topics: ${correlation['topics'].filter((_, i) => i < 4).map(({ label }) => label).join(', ')}
- Adjectives: ${correlation['adjectives'].filter((_, i) => i < 5).map(({ label }) => label).join(', ')}

Top videos:
${topTexts.map(t => `- ${t}`).join('\n')}
` 
}

export const getWorstAttributesPrompt = (verticalCorrelations:tVerticalCorrelations, texts:iItem[]) => {
    const decorrelationInput = {sortKey:'prominence' as const, inverse:true, correlations:verticalCorrelations}
    const decorrelation = orderAttributes(decorrelationInput)

    // Get worst 5 texts by output.
    const worstTexts = texts.sort((a, b) => a.output - b.output).map(({ text }) => text).slice(0, 5)

    const task = "explains what does not drive performance."

    return `${instructionsPrompt(task)}

Worst performing attributes:
- Emotions: ${decorrelation['emotions'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Topics: ${decorrelation['topics'].filter((_, i) => i < 5).map(({ label }) => label).join(', ')}
- Adjectives: ${decorrelation['adjectives'].filter((_, i) => i < 7).map(({ label }) => label).join(', ')}

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



export const getVerticalPrompt = (vertical:string, correlations:tVerticalCorrelations) => {
    // For the given vertical select the top attributes by mean, and prominence.
    const attributes = orderAttributes({sortKey: 'mean', correlations})
    const correlation = orderAttributes({sortKey: 'prominence', correlations})
    const decorrelationInput = {sortKey:'prominence' as const, inverse:true, correlations}
    const decorrelation = orderAttributes(decorrelationInput)

    const verticalAttributes = attributes[vertical]
    const verticalCorrelation = correlation[vertical]
    const verticalDecorrelation = decorrelation[vertical]

    const task = `describes the content of the ${vertical} that drive engagement.`

    const quantity = {emotions: 3, topics:5, adjectives:7 }[vertical] || 5
    return `${instructionsPrompt(task)}

Most common ${vertical}: ${verticalAttributes.filter((_, i) => i < quantity).map(({ label }) => label).join(', ')}
Top performing ${vertical}: ${verticalCorrelation.filter((_, i) => i < quantity).map(({ label }) => label).join(', ')}
Worst performing ${vertical}: ${verticalDecorrelation.filter((_, i) => i < quantity).map(({ label }) => label).join(', ')}

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


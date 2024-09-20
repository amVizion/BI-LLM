import { labelCorrelations } from '../data/verticals.json'
import { iCorrelation } from './types'
import data from '../data/data.json'
import { numberFormater } from './utils'

type tStat = 'rho' | 'mean' | 'sd'
const orderAttributes = (sortKey:tStat, inverse?:boolean) => Object.keys(labelCorrelations)
.reduce((acc, key) => {
    const sortOrder = inverse ? 1 : -1
    acc[key] = [...labelCorrelations[key as keyof typeof labelCorrelations]]
    .sort((a, b) => a[sortKey] > b[sortKey] ? sortOrder : -sortOrder)

    return acc
}, {} as {[key:string]:iCorrelation[]})

const getQuartile = (data:number[]) => {
    const sorted = data.sort((a, b) => a - b)
    const q1 = sorted[Math.floor(sorted.length / 4)]
    const q2 = sorted[Math.floor(sorted.length / 2)]
    const q3 = sorted[Math.floor(sorted.length * 3 / 4)]
    return { q1, q2, q3 }
}


export const getReport = () => {
    const attributes = orderAttributes('mean')
    console.log('attributes', attributes)
    const correlation = orderAttributes('rho')
    const decorrelation = orderAttributes('rho', true)

    const outputs = data.map(({ output }) => output)
    const { q1, q2, q3 } = getQuartile(outputs)

    const Q1 = numberFormater(q1, true)
    const Q2 = numberFormater(q2, true)
    const Q3 = numberFormater(q3, true)

    return `Generate a brief analysis of the performance of a YouTube channel.

The attributes that are most frequent in the content are 
- Emotions: ${attributes['emotions'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Topics: ${attributes['topics'].filter((_, i) => i < 5).map(({ label }) => label).join(', ')}
- Adjectives: ${attributes['adjectives'].filter((_, i) => i < 7).map(({ label }) => label).join(', ')}

The attributes that contribute the most to a good performance are:
- Emotions: ${correlation['emotions'].filter((_, i) => i < 2).map(({ label }) => label).join(', ')}
- Topics: ${correlation['topics'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Adjectives: ${correlation['adjectives'].filter((_, i) => i < 5).map(({ label }) => label).join(', ')}

While the attributes that contribute the most to a bad performance are:
- Emotions: ${decorrelation['emotions'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Topics: ${decorrelation['topics'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}
- Adjectives: ${decorrelation['adjectives'].filter((_, i) => i < 3).map(({ label }) => label).join(', ')}

The median number of views is ${Q2}. 
While the top quartile is at ${Q3}, and the bottom quartile at ${Q1} views.`
}

export const PREDICTION_PROMPT = ``

export const VERTICAL_ANAYLSIS_PROMPT = ``


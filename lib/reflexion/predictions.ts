import { iItem } from '../../app/src/utils/types'
import { callOllama } from '../utils/ollama'
import { iInputText } from '../utils/types'
import { iQuartiles } from './evaluation'
import { writeFileSync } from 'fs'


const PLAIN_INSTRUCTIONS = `
Your task is to make a prediction on the number of views for a given YouTube video.
The prediction will be based on the YouTube channels analysis provided earlier.  
Do not provide additional explanations, only the expected number of views. The prediction needs to be numeric. 
Do not provide an introduction to your prediction either. Only provide the expected number of views.
Do not provide a range for your prediction, either. Only provide the expected number of views. 
`

const COT_INSTRUCTIONS = `
Your task is to make a prediction on the number of views for a given YouTube video.
Before making a prediction, you will provide an analysis explaining your reasoining behind the prediction.
In your analysis, consider the emotion, topic, and adjectives that describe the YouTube video.
Your response should be in a JSON object format with the following keys:
- analysis: a string explaining your reasoning behind the prediction
- prediction: a numeric value representing the expected number of views
`

interface iPredictionPrompt { title:string, report:string, quartiles:iQuartiles, instructions:string }
const PREDICTION_PROMPT = ({ title, report, quartiles, instructions }:iPredictionPrompt) => `
YouTube channel performance analysis:
${report}

The median number of views for this channel is ${quartiles.median}
And the top quartile reaching ${quartiles.q1} views and the bottom quartile is at ${quartiles.q3} views. 
The maximum number of views is ${quartiles.max} and the minimum number of views is ${quartiles.min}.

Instructions:
${instructions}


YouTube video title:
${title}

Prediction:`

export const makePredictions = async(items:iItem[], report:string, quartiles:iQuartiles, fileName:string) => {
    const sampleItems = [...items].sort(() => Math.random() - 0.5).slice(0, 100)
    const predictions:iInputText[] = []
    for (const item of sampleItems) {
        const promptInput = { title:item.text, report, quartiles, instructions:PLAIN_INSTRUCTIONS }
        const prompt = PREDICTION_PROMPT(promptInput)
        const output = await callOllama(prompt, false)
        if(isNaN(Number(output))) continue
        predictions.push({ text:item.text, output:Number(output) })
    }

    const result = predictions.map((i,idx) => ({ 
        ...sampleItems.find((item) => item.text === i.text)!,
        prediction:predictions[idx].output
    }))

    const purePredictions = result.map(({ text, output, prediction }) => (
        { text, output, prediction }
    ))

    writeFileSync(`${fileName}.json`, JSON.stringify(purePredictions, null, 2))
    return result
}


interface iCotPredictionPrompt { item:iItem, report:string, quartiles:iQuartiles }
export const cotPrediction = async({ item, report, quartiles }:iCotPredictionPrompt) => {
    const promptInput = { title:item.text, report, quartiles, instructions:COT_INSTRUCTIONS }
    const prompt = PREDICTION_PROMPT(promptInput)
    const output = await callOllama(prompt)

    // Validate keys
    const prediction = JSON.parse(output)
    if(!prediction.analysis || !prediction.prediction) throw new Error('Invalid prediction format')

    // Validate prediction is numeric
    if(isNaN(Number(prediction.prediction))) throw new Error('Prediction must be numeric')

    // Validate prediction is above 0
    if(Number(prediction.prediction) < 0) throw new Error('Prediction must be above 0')

    return { ...item, prediction:prediction.prediction, analysis:prediction.analysis }
}

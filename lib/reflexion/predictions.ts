import { iItem } from "../../app/src/utils/types"
import { callOllama } from "../utils/ollama"
import { iInputText } from "../utils/types"
import { iQuartiles } from "./evaluation"

const PREDICTION_PROMPT = (title:string, report:string, quartiles:iQuartiles) => `
YouTube channel performance analysis:
${report}

The median number of views for this channel is ${quartiles.median}
And the top quartile reaching ${quartiles.q1} views and the bottom quartile is at ${quartiles.q3} views. 


Instructions:
Your task is to make a prediction on the number of views for a given YouTube video.
The prediction will be based on the YouTube channels analysis provided earlier.  
Do not provide additional explanations, only the expected number of views. The prediction needs to be numeric. 
Do not provide an introduction to your prediction either. Only provide the expected number of views.
Do not provide a range for your prediction, either. Only provide the expected number of views. 

YouTube video title:
${title}

Prediction:`

export const makePredictions = async(items:iItem[], report:string, quartiles:iQuartiles) => {
    const sampleItems = items.sort(() => Math.random() - 0.5).slice(0, 100)
    const predictions:iInputText[] = []
    for (const item of sampleItems) {
        const prompt = PREDICTION_PROMPT(item.text, report, quartiles)
        const output = await callOllama(prompt)
        if(isNaN(Number(output))) continue
        predictions.push({ text:item.text, output:Number(output) })
    }

    const result = predictions.map((i,idx) => ({ 
        ...sampleItems.find((item) => item.text === i.text)!,
        prediction:predictions[idx].output
    }))
    return result
}

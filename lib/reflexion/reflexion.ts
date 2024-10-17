import { writeFileSync } from "fs"
import { iItem } from "../../app/src/utils/types"
import { callOllama } from "../utils/ollama"


export const REFLEXION_PROMPT = (item:iItem, performance:string) => `
Write a short 2-3 sentence analysis evaluating the prediction of number of views for a YouTube video.
When evaluating the prediction, consider the reasoning behind the prediction, and the prediction acuracy.

YouTube video title:
${item.text}

Reasoning:
${item.analysis}

Prediction: ${item.prediction}
YouTube video views: ${item.output}

Evaluation:
The prediction accuracy was ${performance} than average because `

const SUMMARY_PROMPT = (evals:string[]) => `
Your task is to write a summary of the evaluations below.
The summary will be used to improve a report that is used make the predictions on the performance of YouTube videos.

## Evaluations
- ${evals.join('\n\n')}

## Summary
`

const REPORT_PROMPT = (report:string, reflexion:string) => `
Your task is to improve a report on the performance of YouTube videos.
You will be provided with a summary of suggested improvements, and the existing report.
Incorporate the suggestions into the existing report.
Be consice: focus on delivering the key insights that drive engagement.

## Suggested Improvements
${reflexion}

## Existing Report
${report}

## Improved Report
`

export const reflexion = async(predictions:iItem[], report:string, dir:string) => {
    // Get reflexion prompts
    const deltas = predictions.map((i) => Math.abs(Math.log(i.prediction + 1) - Math.log(i.output + 1)))
    const meanLogError = deltas.reduce((a,b) => a + b, 0) / deltas.length

    const items = predictions.map((i,idx) => ({ 
        ...i, performance: meanLogError > deltas[idx] ? 'better' : 'worse' 
    })).filter((i) => i.performance === 'worse')

    console.log(meanLogError)
    console.log(deltas)

    const evals = []

    for(const item of items) {
        const prompt = REFLEXION_PROMPT(item, item.performance)
        const evaluation = await callOllama(prompt)
        const suffix = `prediction ${item.prediction}/ number of views ${item.output}`
        evals.push(`${item.text} (${suffix}): ${evaluation}`)
    }

    writeFileSync(`${dir}/evaluations.json`, JSON.stringify(evals, null, 2))


    // Summarize prompts
    const summaryPrompt = SUMMARY_PROMPT(evals)
    const summary = await callOllama(summaryPrompt)
    writeFileSync(`${dir}/improvements.txt`, summary)

    // Improve report
    const reportPrompt = REPORT_PROMPT(report, summary)
    const reflexion = await callOllama(reportPrompt)

    writeFileSync(`${dir}/reflexion.txt`, reflexion)
    return reflexion
} 


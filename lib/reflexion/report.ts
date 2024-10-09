import { writeFileSync } from 'fs'
import { getIntroductionPrompt, getTopAttributesPrompt } from '../../app/src/utils/prompts'
import { getWorstAttributesPrompt, getVerticalPrompt } from '../../app/src/utils/prompts'
import { iCorrelation, iItem } from '../../app/src/utils/types'
import { callOllama } from '../utils/ollama'

interface iGetReport { 
    items:iItem[]
    correlations:iCorrelation[]
    verticalCorrelations:{[vertical:string]:iCorrelation[]}
    dir:string
}

const getSummaryPrompt = (report:string) => {

    return `You are a data analyst, and your task is to write a summary for the report below.
Your summary will be used to make predictions about the performance of YouTube videos.
Focus on identifying the key drivers of engagement. 
Also mention what does not work to help make accurate predictions.

## Report
${report}

## Summary
`
}

export const getReport = async(input:iGetReport) => {
    const { items, correlations, verticalCorrelations, dir } = input
    const verticals = Object.keys(verticalCorrelations)

    // Introduction prompt.
    const intro = getIntroductionPrompt(correlations, items)

    // Top attributes.
    const topAttributes = getTopAttributesPrompt(correlations, items)

    // Worst attributes.
    const worstAttributes = getWorstAttributesPrompt(correlations, items)

    // Iterate verticals.
    const verticalPrompts = verticals.map((vertical) => {
        const prompt = getVerticalPrompt(vertical, verticalCorrelations[vertical])
        return prompt
    })

    const prompts = [
        { prompt: intro, title: 'intro' },
        { prompt: topAttributes, title: 'topAttributes' },
        { prompt: worstAttributes, title: 'worstAttributes' },
        ...verticalPrompts.map((prompt, i) => (
            { prompt, title: verticals[i], key: `vertical` }
        ))
    ]

    const reportObj:{[title:string]:string} = {}
    const reportArray:string[] = []

    // Write report.
    for (const prompt of prompts) {
        const output = await callOllama(prompt.prompt)
        reportObj[prompt.title] = output
        reportArray.push(output)
    }

    const report = reportArray.join('\n\n')

    // Summarize.
    const summaryPrompt = getSummaryPrompt(report)
    const summary = await callOllama(summaryPrompt)

    writeFileSync(`${dir}/reportObj.json`, JSON.stringify(reportObj, null, 2))
    writeFileSync(`${dir}/report.txt`, report)
    writeFileSync(`${dir}/summary.txt`, summary)

    return summary
}

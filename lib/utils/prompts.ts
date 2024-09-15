import { iCluster, iClusterReport, iReportAnalysis } from "../../app/src/utils/types"
import { iResearchContext } from "./types"
import { callOllama } from "./ollama" 

export const LABEL_PROMPT = ({itemName, purpose}: iResearchContext) => `
Describe the following ${itemName} in 3 single-words.
For an analysis with the purpose of ${purpose}.
Be brief, do not provide explanations. Use a JSON list as output.

${itemName}:`

const SCORE_PROMPT = (itemName:string) => `
Score the ${itemName} below based on the following attributes.
Provide a score between 0 and 10 for each attribute. 
Score harshly. Use a JSON object as an output.
Do not provide explanations.
`

interface iScorePrompt { intro?:string, attributes:string[], text:string, itemName:string }
export const getScorePrompt = ({ intro, attributes, text, itemName }:iScorePrompt) => `
${intro || SCORE_PROMPT(itemName)}

Attributes:
${attributes.join(', ')}

${itemName}: 
${text}
`

export const getTitle = async(analysis:string) => await callOllama(`
Write a title for the following analysis.
Be succint. Only provide the title, no subtitle, introduction or explanation. 
Use 7 words or less.

Analysis:
${analysis}

Title:
`) 

export const getIntro= async(analysis:string, purpose:string) => await callOllama(`
Write an introduction for the following analysis with the purpose of ${purpose}.
Be succint. Do not provide a title. Write a single paragraph.

Analysis:
${analysis}

Introduction:
`)

type tVerticalLabels = { [vertical:string]:string[] } | string[] | any
interface iVerticalDescription { 
    itemName:string
    verticals?: string[]
    labels: tVerticalLabels
}
const describeCluster = async({ itemName, verticals, labels }: iVerticalDescription) => await callOllama(`
Describe in one paragraph the nature of a ${itemName} collection that shares the following attributes:
${verticals
    ? verticals.map((vertical, i) => labels[vertical].length ? 
        `- Attributes related to ${vertical}: ${labels[vertical].join(', ')}` : '').join('\n')
    : `- Attributes: ${labels.join(', ')}`
}`)


interface iVerticalExplanation { 
    purpose:string
    verticals?: string[]
    positive: tVerticalLabels
    negative: tVerticalLabels
}

// Deals with causality
const explainLabels = async({verticals, purpose, positive, negative}:iVerticalExplanation) => await callOllama(`
Write one paragraph to ${purpose} based on the following attributes.
Do not provide an introduction of the analysis. Dive deep straight to the insights.

Attributes that correlate positively with the expected outcome:
${verticals
    ? verticals.map(vertical => `- ${vertical} attributes: ${positive[vertical].join(', ')}`).join('\n')
    : `- Attributes: ${positive.join(', ')}`
}

Attributes that correlate negatively with the expected outcome:
${verticals
    ? verticals.map((vertical, i) => `- ${vertical} attributes: ${negative[vertical].join(', ')}`).join('\n')
    : `- Attributes: ${negative.join(', ')}`
}
`)
    

const titleCluster = async(itemName:string, description:string) => await callOllama(`
Choose a name, title, and summary for the following ${itemName} collection based on the description of its common attributes.
The name should not be more than 3 words long, the title should not exceed 100 characters, and the summary should not exceed 250 characters.
Use a JSON object as output with keys "name", "title", and "summary".

Description:
${description}
`)

interface iGetTitleClusterOutput { name:string, title:string, summary:string }
const getTitleCluster = async(itemName:string, description:string):Promise<iGetTitleClusterOutput> => {
    try{
        const titleResponse = await titleCluster(itemName, description)
        const { name, title, summary } = JSON.parse(titleResponse)

        if(!name && name.split(' ').length > 3 ) throw new Error('No name found')
        if(!title && title.length > 100 ) throw new Error('No title found')
        if(!summary && summary.length > 250 ) throw new Error('No summary found')
        return { name, title, summary }
    
    } catch(e) { return await getTitleCluster(itemName, description) }
}

export type tLabelPrompt = { [vertical:string]:string[] } |  string[]
interface iGetClusterAnalysisInput { 
    index: number
    verticals?:string[]
    context: iResearchContext, 
    labels: tLabelPrompt
    positive?: tLabelPrompt
    negative?: tLabelPrompt
}

export const getClusterAnalysis = async(input:iGetClusterAnalysisInput):Promise<iClusterReport> => {
    const { context, labels, positive, negative, verticals, index } = input
    const { itemName, purpose } = context

    const description = await describeCluster({itemName, verticals, labels})
    const analysis = await explainLabels({ verticals, purpose, positive, negative })
    const title = await getTitleCluster(itemName, description)

    return { index, description, analysis, ...title }
}

const explainClusters = async({ purpose, clusters }:{purpose:string, clusters:iCluster[]}) => await callOllama(`
The following clusters have been ranked by performance to ${purpose}.
Based on the cluster summaries, explain what contributed to the different outcomes. 

The last clusters did not perform well, explain why.
Do not provide individual explanations for each clusters. Instead summarize your insights in a concise analysis.

Do not provide an introduction of the analysis. Dive deep straight to the insights.

Clusters:
${ clusters.sort(({ avgOutput:a }, { avgOutput:b }) => a > b ? -1 : 1)
.map(({ name, summary }, i) => `- ${i+1}. ${name}: ${summary}`).join('\n') }
`)

interface iWriteAnalysis { 
    purpose:string, 
    verticals:string[], 
    positive:tLabelPrompt, 
    negative:tLabelPrompt, 
    clusters:iCluster[] 
}

export const writeAnalysis = async(input:iWriteAnalysis):Promise<iReportAnalysis> => {
    const { purpose, verticals, positive, negative, clusters } = input
    const labels = await explainLabels({ verticals, purpose, positive, negative })
    const clustersAnalysis = await explainClusters({ purpose, clusters })

    return { labels, clusters:clustersAnalysis }
}


const summarizeReport = async(body:string) => await callOllama(`
Summarize the following text into a succint conclusion.

Text:
${body}
`)

const explainReport = async(purpose:string, outcome:string, positive:string[], negative:string[]) => await callOllama(`
Conclude the analysis with the purpose of ${purpose} based on the following findings.

Attributes that correlate the most with the ${outcome}: ${positive.join(', ')}
Attributes that negatively correlate with the ${outcome}:  ${negative.join(', ')}
`)

const getConclusion = async(summary:string, explanation:string) => await callOllama(`
Consolidate the following summary, and explanation into a cohesive satisfying conclusion

Summary:
${summary}

Explanation:
${explanation}
`)

export const writeConclusion = async(report:string) => {

    const summary = await summarizeReport(report)
//    const explanation = await explainReport(purpose, outcome, positive, negative)
//    const conclusion = await getConclusion(summary, explanation)

    return summary
}

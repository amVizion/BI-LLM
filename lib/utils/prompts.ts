import { callOllama } from "./ollama" 

export const LABEL_PROMPT = (purpose:string, itemName:string) => `
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


const INTRO_PROMPT = ``
interface iIntroInput { purpose:string, labels:string[] }
export const getIntro= async({ purpose, labels }:iIntroInput) => await callOllama(`
Provide an introduction for a data analysis based on the purpose of ${purpose}
The analysis considered the attributes: ${labels.join(', ')}.
    ${INTRO_PROMPT}: ${purpose}`)

const describeCluster = async(items:string, attributes:string[]) => await callOllama(`
Write one paragraph describing a group of ${items}s that share similar attributes including: 
${attributes.join(', ')}:
`) // TODO: Helper function to substitute final comma (',') with conjunction (and).

// Deals with causality
const explainCluster = async(itemName:string, outcome:string, positive:string[], negative:string[]) => await callOllama(`
Write one paragraph narrative that explains the causality between a ${itemName} and the ${outcome}:
Attributes that correlate positively with the ${outcome} are: ${positive.join(', ')}
While attributes that correlate negatively with the ${outcome} are: ${negative.join(', ')} 
`)

const writeCluster = async(description:string, explanation:string) => await callOllama(`
Consolidate the following description, and explanation into a cohesive analytical narrative

Description:
${description}

Explanation:
${explanation}
`)

interface iGetClusterAnalysisInput { itemName:string, labels:string[], outcome:string, positive:string[], negative:string[] }
export const getClusterAnalysis = async(input:iGetClusterAnalysisInput) => {
    const { itemName, labels, outcome, positive, negative } = input

    const description = await describeCluster(itemName, labels)
    const explanation = await explainCluster(itemName, outcome, positive, negative)
    const clusterAnalysis = await writeCluster(description, explanation)

    return clusterAnalysis
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


interface iWriteConclusionInput { purpose:string, outcome:string, positive:string[], negative:string[] }
export const writeConclusion = async(input:iWriteConclusionInput) => {
    const { purpose, outcome, positive, negative } = input

    const summary = await summarizeReport(purpose)
    const explanation = await explainReport(purpose, outcome, positive, negative)
    const conclusion = await getConclusion(summary, explanation)

    return conclusion
}

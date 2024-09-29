import { getTopAttributesPrompt, getWorstAttributesPrompt, getVerticalPrompt } from "../utils/prompts"
import { getAnalysisPrompt, getIntroductionPrompt, getSummaryPrompt } from "../utils/prompts"
import { getTopVideosPrompt, getWorstVideosPrompt, getAttributePrompt } from "../utils/prompts"

import { VerticalCorrelations } from '../components/Correlations'
import { Predictions } from '../components/Predictions'
import { PromptBox } from '../components/PromptBox'
import { Chart } from "../components/Chart"

import { iVerticals } from '../utils/types'
import { useEffect, useState } from 'react'
import DATA from '../data/data.json'


export interface iAction { type:string, value?:string }
export const Items = ({ verticals, verticalCorrelations }:iVerticals) => {
	const [prompt, setPrompt] = useState<string>('')
    const [action, setAction] = useState<iAction>()

    useEffect(() => {
        if(!action || !verticalCorrelations) return
        const { type, value } = action 

		const prompt = {
			INTRO: () => getIntroductionPrompt(verticalCorrelations, DATA),
			TOP_ATTRS: () => getTopAttributesPrompt(verticalCorrelations, DATA),
			WORST_ATTRS: () => getWorstAttributesPrompt(verticalCorrelations, DATA),
			SUMMARY: () => getSummaryPrompt(DATA),
			ANALYSIS: () => getAnalysisPrompt(DATA),
            VERTICAL: () => getVerticalPrompt(value!, verticalCorrelations),
            TOP_VIDEOS: () => getTopVideosPrompt(DATA),
            WORST_VIDEOS: () => getWorstVideosPrompt(DATA),
            ATTRIBUTE:() => getAttributePrompt(value!, DATA)
		}[type]

		setPrompt(prompt || '')

    }, [action, verticalCorrelations])

    return <div className='container' style={{maxWidth:1600}}>
        <Chart data={DATA} outputKey='Views'/>
        <PromptBox prompt={prompt} setAction={setAction} setPrompt={setPrompt}/>

        <VerticalCorrelations 
            verticals={verticals} 
            setAction={setAction}
            verticalCorrelations={verticalCorrelations!} 
        />

        <Predictions items={DATA.sort((a, b) => b.output - a.output)}/>
    </div>
}

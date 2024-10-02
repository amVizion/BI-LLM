import { getAnalysisPrompt, getIntroductionPrompt, getSummaryPrompt, getSimilarityPrompt } from "../utils/prompts"
import { getTopAttributesPrompt, getWorstAttributesPrompt, getVerticalPrompt } from "../utils/prompts"
import { getTopVideosPrompt, getWorstVideosPrompt, getAttributePrompt } from "../utils/prompts"
import { clusterItems } from "../utils/utils"

import { iItem, tVerticalCorrelations, iCorrelation, iCluster } from '../utils/types'
import { ClusterCorrelations, VerticalCorrelations } from '../components/Correlations'
import { Predictions } from '../components/Predictions'
import { PromptBox } from '../components/PromptBox'
import { Chart } from "../components/Chart"

import { useEffect, useState } from 'react'


export interface iAction { type:string, value?:string|iItem }
interface iItemsView { 
    items:iItem[], 
    verticals:string[], 
    correlations:iCorrelation[]
    verticalCorrelations:tVerticalCorrelations 
}

export const Items = ({ items, verticals, verticalCorrelations, correlations }:iItemsView) => {
	const [prompt, setPrompt] = useState<string>('')
    const [action, setAction] = useState<iAction>()

    const [clusteredItems, setClusteredItems] = useState<iItem[]>()
    const [clusters, setClusters] = useState<iCluster[]>()

    useEffect(() => {
        if(!action || !verticalCorrelations) return
        const { type, value } = action

        if(type === 'CLUSTER') {
            const { clusters, clusteredItems } = clusterItems(items, correlations, verticalCorrelations)
            setClusters(clusters)
            setClusteredItems(clusteredItems)

            console.log(clusters, clusteredItems)
            
            return    
        }


		const prompt = {
			INTRO: () => getIntroductionPrompt(verticalCorrelations, items),
			TOP_ATTRS: () => getTopAttributesPrompt(verticalCorrelations, items),
			WORST_ATTRS: () => getWorstAttributesPrompt(verticalCorrelations, items),
			SUMMARY: () => getSummaryPrompt(items),
			ANALYSIS: () => getAnalysisPrompt(items),
            VERTICAL: () => getVerticalPrompt(value!  as string, verticalCorrelations),
            TOP_VIDEOS: () => getTopVideosPrompt(items),
            WORST_VIDEOS: () => getWorstVideosPrompt(items),
            ATTRIBUTE:() => getAttributePrompt(value! as string, items),
            SIMILAR:() => getSimilarityPrompt(value! as iItem, items)
		}[type] // TODO: Add new high level prop to action interface.

		setPrompt(prompt || '')

    }, [action, verticalCorrelations, items, correlations])


    return <div className='container' style={{maxWidth:1600}}>
        <Chart data={clusteredItems || items} outputKey='Views' clusters={clusters}/>
        <PromptBox prompt={prompt} setAction={setAction} setPrompt={setPrompt}/>

        <VerticalCorrelations 
            setAction={setAction}
            verticals={verticals || []} 
            verticalCorrelations={verticalCorrelations!} 
        />

        { clusters && <ClusterCorrelations clusters={clusters} /> }

        <Predictions 
            clusters={clusters}
            setAction={setAction}
            correlations={correlations}
            items={items.sort((a, b) => b.output - a.output)}
        />
    </div>
}

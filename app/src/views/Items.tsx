import { getTopAttributesPrompt, attributePerformance, getVerticalPrompt } from '../utils/prompts'
import { getClusterDescriptionPrompt, channelPerformance, describeChannel } from '../utils/prompts'
import { getTopVideosPrompt, getWorstVideosPrompt, getSimilarityPrompt } from '../utils/prompts'
import { attributeTopChannels, describeAttribute, getAttributePrompt } from '../utils/prompts'
import { getAnalysisPrompt, getIntroductionPrompt, getSummaryPrompt } from '../utils/prompts'
import { getWorstAttributesPrompt, getClusterPerformancePrompt } from '../utils/prompts'
import { iItem, tVerticalCorrelations, iCorrelation, iCluster } from '../utils/types'
import { clusterItems } from '../utils/utils'

import { ClusterCorrelations, VerticalCorrelations } from '../components/Correlations'
import { Predictions } from '../components/Predictions'
import { PromptBox } from '../components/PromptBox'
import { Chart } from '../components/Chart'

import { useEffect, useState } from 'react'


export interface iAction { type:string, value?:string|iItem|iCluster, async?:boolean }
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
        const { type, value, async } = action

        if(type === 'CLUSTER') {
            const { clusters, clusteredItems } = clusterItems(items, correlations, verticalCorrelations)
            setClusters(clusters)
            setClusteredItems(clusteredItems)
            
            return    
        }

        const asyncPrompt = async() => {
            if(type === 'CHANNEL_DESC') {
                const prompt = await describeChannel(value! as iItem, correlations)
                setPrompt(prompt)
            } 

            if(type === 'CHANNEL_PERF') {
                const prompt = await channelPerformance(value! as iItem, correlations)
                setPrompt(prompt)
            }

            if(type === 'ATTR_DESC') {
                const prompt = await describeAttribute(value! as string, correlations)
                setPrompt(prompt)
            }

            if(type === 'ATTR_PERF') {
                const prompt = await attributePerformance(value! as string, correlations)
                setPrompt(prompt)
            }

            if(type === 'ATTR_CHANNELS') {
                const attribute = value! as string
                const prompt = await attributeTopChannels(attribute, items, correlations)
                setPrompt(prompt)
            }
        }

        if(async) {
            asyncPrompt()
            return
        }

        const prompt = {
            INTRO: () => getIntroductionPrompt(correlations, items),
            TOP_ATTRS: () => getTopAttributesPrompt(correlations, items),
            WORST_ATTRS: () => getWorstAttributesPrompt(correlations, items),
            SUMMARY: () => getSummaryPrompt(items),
            ANALYSIS: () => getAnalysisPrompt(items),
            VERTICAL: () => getVerticalPrompt(value!  as string, verticalCorrelations[value! as string]),
            TOP_VIDEOS: () => getTopVideosPrompt(items),
            WORST_VIDEOS: () => getWorstVideosPrompt(items),
            ATTRIBUTE:() => getAttributePrompt(value! as string, items),

            CLUSTER_DESC:() => getClusterDescriptionPrompt(value! as iCluster),
            CLUSTER_PERF:() => getClusterPerformancePrompt(value! as iCluster),

            SIMILAR:() => getSimilarityPrompt(value! as iItem, items)
        }[type] // TODO: Add new high level prop to action interface.

        
        setPrompt(prompt || '')
    }, [action, verticalCorrelations, items, correlations])


    return <div className='container' style={{maxWidth:1600}}>
        <Chart 
            data={clusteredItems || items} 
            outputKey='Views' 
            clusters={clusters} 
            setAction={setAction}
        />
        <PromptBox prompt={prompt} setAction={setAction} setPrompt={setPrompt}/>

        <VerticalCorrelations 
            setAction={setAction}
            verticals={verticals || []} 
            verticalCorrelations={verticalCorrelations!} 
        />

        { clusters && <ClusterCorrelations clusters={clusters} setAction={setAction} /> }

        <Predictions 
            clusters={clusters}
            setAction={setAction}
            correlations={correlations}
            items={items.sort((a, b) => b.output - a.output)}
        />
    </div>
}

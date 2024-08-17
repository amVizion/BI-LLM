export interface iInputText { text:string, output:number } // TODO: Enable unsupervised learning.
export interface iEmbeddedText extends iInputText { embeddings:number[] } 
export interface iScoredText extends iEmbeddedText { scores:tScore[] }
export interface iLabeledText extends iEmbeddedText { labels:tScore[], prediction:number }
export interface iClusteredText extends iLabeledText { cluster:number, center:number[] }


type tScore = { label:string, score:number }
type tAttribute = { label:string, average:number, prevalence:number, correlation:number, causality:number }

export interface iCluster { index:number, items:iLabeledText[], centroid:number[], center:number[] }
export interface iColoredCluster extends iCluster { color:string, avgOutput:number }
export interface iCorrelatedCluster extends iColoredCluster { attributes: tAttribute[] }


export interface iCorrelation { label:string, rho:number, mean:number, sd:number }
export interface iResearchContext { purpose:string, outcome:string, itemName:string }
export interface iResearch { intro:string, body:string[], conclusion:string }

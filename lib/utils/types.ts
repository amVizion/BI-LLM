export interface iInputText { text:string, output:number } // TODO: Enable unsupervised learning.
export interface iEmbeddedText extends iInputText { embeddings:number[] } 
export interface iScoredText extends iEmbeddedText { scores:tScore[] }
export interface iLabeledText extends iEmbeddedText { 
    labels:tScore[]
    prediction:number 
    verticalLabels?:{ [vertical:string]:tScore[] }
}


export interface iClusteredText extends iLabeledText { cluster:number, center:number[] }


export type tScore = { label:string, score:number }
export type tVerticalLabels = { [vertical:string]:string[] }

export interface iRawCluster { index:number, centroid:number[], center:number[] }
export interface iColoredCluster extends iRawCluster { color:string, avgOutput:number }

export interface iResearchContext { purpose:string, outcome:string, itemName:string }

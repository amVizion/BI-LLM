
type tScore = { label:string, score:number }
type tAttribute = { 
    label:string
    average:number
    prevalence:number
    correlation:number
    causality:number 
}

export interface iCorrelation { label:string, rho:number, mean:number, sd:number }
export interface iResearch { intro:string, body:string[], conclusion:string }


export interface iCluster { 
    index:number
    name?:string
    items:iItem[]
    centroid:number[]
    center:number[] 
    color:string
    avgOutput:number
    attributes: tAttribute[]
    subClusters?: iCluster[]
}

export interface iItem { 
    text:string
    output:number 
    embeddings:number[]
    labels:tScore[]
    prediction:number
    cluster:number
    center:number[]
}


export interface iScatterData {
    title: string
    x: number 
    y: number             
    z: number
    fit: number
    output: number
    fill:string
}


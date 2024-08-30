
type tScore = { label:string, score:number }
type tAttribute = { 
    label:string
    average:number
    prevalence:number | null
    correlation:number
    causality:number | null
}

export interface iCorrelation { label:string, rho:number, mean:number, sd:number }
export interface iResearch { intro:string, body:string[], conclusion:string }


export interface iCluster { 
    index:number
    name?:string
    size:number
    centroid:number[]
    center:number[] 
    color:string
    avgOutput:number
    attributes: tAttribute[]
    subClusters?: iCluster[]
    verticalCorrelations?: {[vertical:string]:iCorrelation[]}
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

export interface iVerticals {
    verticals: string[]
    correlations: {[vertical:string]:number}
    labelCorrelations: {[vertical:string]:iCorrelation[]}
}


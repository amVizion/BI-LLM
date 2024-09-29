
type tScore = { label:string, score:number }
export type tAttribute = { 
    label:string
    average:number
    prevalence:number | null
    correlation:number
    causality:number | null
}

export interface iCorrelation { label:string, rho:number, mean:number, sd:number }


export interface iClusterReport { 
    index: number
    name: string
    title: string 
    summary: string
    description: string 
    analysis: string
}

export interface iReportAnalysis { 
    labels: string
    clusters: string
    verticals?: string
}

export interface iReport { 
    title: string
    intro: string
    clusters: iClusterReport[]
    analysis: iReportAnalysis
    conclusion:string 
}

export interface iCluster { 
    index:number

    name?:string
    summary?: string
    description?: string

    size:number
    color:string
    center:number[] 
    centroid:number[]
    avgOutput:number
    attributes: tAttribute[]

    subClusters?: iCluster[]
    verticalAttributes?: {[vertical:string]:tAttribute[]}
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


// Full correlation includes prominence.
// Prominence is the mean times the correlation. How relevant is the attribute to the performance.
export interface iFullCorrelation extends iCorrelation { prominence:number } 
export type tVerticalCorrelations = {[vertical:string]:iFullCorrelation[]}

export interface iVerticals {
    verticals: string[]
    correlations: {[vertical:string]:number | null}
    labelCorrelations: {[vertical:string]:iCorrelation[]}
    verticalCorrelations?: tVerticalCorrelations
}

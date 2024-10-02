import { iItem, iCluster, tClusterAttrStats, iCorrelation, tVerticalCorrelations } from "./types"
import { kMeansCluster } from "simple-statistics"

export const numberFormater = (value:string|number, longFormat?:boolean) => {
    const number = Number(value)

    if(number > 1000*1000*1000) return Math.round(number/(1000*1000*1000)).toString() + 'B'
    if(number > 1000*1000) return Math.round(number/(1000*1000)).toString() + (longFormat ? ' millions' : 'M')
    if(number > 1000) return Math.round(number/1000).toString() + (longFormat ? ' thousand' : 'K')

    return Math.round(number).toString()
}

export const getColors = (outputs:number[]) => {
    const maxOutput = Math.max(...outputs)
    const minOutput = Math.min(...outputs)

    const coloredOutputs = outputs.map(output => {
        const green = 255 * (output - minOutput) / (maxOutput - minOutput)
        const red = 255 - green
        const color = `rgb(${red}, ${green}, 0)`
        return color
    }) 

    return coloredOutputs
}

export const getStats = (outputs:number[]) => {
    const mean = outputs.reduce((acc, output) => acc + output, 0) / outputs.length
    const sd = Math.sqrt(outputs.reduce((acc, output) => acc + Math.pow(output - mean, 2), 0) / outputs.length)
    const rho = outputs.reduce((acc, output) => acc + (output - mean) / sd, 0) / outputs.length

    return { mean, sd, rho }
}

export const clusterItems = (items:iItem[], correlations:iCorrelation[], verticalCorrelations:tVerticalCorrelations) => {
    const embeddings = items.map(i => i.center)
    const { centroids, labels } = kMeansCluster(embeddings, 5)

    const clusteredItems = items.map((item, i) => ({...item, cluster:labels[i]}))


    const clusters:iCluster[] = centroids.map((center, i) => {
        const clusterItems = clusteredItems.filter(item => item.cluster===i)
        const avgOutput = clusterItems.reduce((acc, item) => acc + item.output, 0) / clusterItems.length

        // For all correlation item. Get average score from cluster items.
        const attributes:tClusterAttrStats[] = correlations.map(attr => {
            const values = clusterItems.map(item => item.labels.find(l => l.label === attr.label)!.score)
            const stats = getStats(values)

            const attribute:tClusterAttrStats = {
                label:attr.label,
                mean: stats.mean,
                attrMean: attr.mean,
                deltaMean: stats.mean - attr.mean,

                sd:stats.sd,
                attrSd: attr.sd,
                deltaSd: stats.sd - attr.sd,

                rho:stats.rho,
                attrRho: attr.rho,
                deltaRho: stats.rho - attr.rho,

                prominence: stats.mean * attr.rho,
                clusterProminence: stats.mean * stats.rho
            }
            
            return attribute
        })

        console.log(verticalCorrelations)

        // For every vertical, find the attribute to create the verticalAttributes object.
        type tVerticalAttrs = {[vertical:string]:tClusterAttrStats[]}
        const verticalAttributes = Object.keys(verticalCorrelations).reduce((acc:tVerticalAttrs, vertical:string) => {
            const labels = verticalCorrelations[vertical].map(c => c.label)
            const attrs = labels.map(label => attributes.find(a => a.label === label)!)

            return { ...acc, [vertical]: attrs }
        }, {})

        return {
            index:i,
            center,
            centroid:center,
            avgOutput: avgOutput,
            size: clusterItems.length,
            verticalAttributes,
            attributes,

            color:'',
        }
    })

    const outputs = clusters.map(c => c.avgOutput)
    const coloredClusters = clusters.map((c, i) => ({...c, color: getColors(outputs)[i] }))

    return { clusters:coloredClusters, clusteredItems }
}

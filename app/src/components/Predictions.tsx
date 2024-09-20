import CORRELATIONS from '../data/correlations.json'
import { iCluster, iItem } from "../utils/types"
import { numberFormater } from "../utils/utils"
import { CSSProperties, useEffect, useState } from "react"
import axios from "axios"


const TABLE_HEADER_STYLE:CSSProperties = {color:'black', textAlign:'center', verticalAlign:'middle'}
const API_URL = 'http://localhost:3000'

interface iPrediction {items:iItem[], clusters?:iCluster[]}
export const Predictions = ({items, clusters}:iPrediction) => {
    const [predictions, setPredictions] = useState<iItem[]>(items)

    const makePrediction = async(item:iItem) => {
        try{
            const url = `${API_URL}/prediction`
            const { data } = await axios.post(url, { text:item.text })
            const prediction = Number(data)
            if(isNaN(prediction)) throw new Error('Prediction is not a number')
            return prediction
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch(e) { return makePrediction(item) }
    }

    const makePredictions = async() => {
        for(const idx in predictions){
            const prediction = await makePrediction(items[idx])
            setPredictions((predictions)=> predictions.map((item, i) => 
                i === Number(idx) ? {...item, prediction} : item
            ))
        }
    }

    useEffect(() => {
        // If last item has a prediction with integer number call write predictions
        if(predictions[predictions.length - 1].prediction % 1 !== 0) return

        const url = `${API_URL}/writeFile`
        const summarizedPredictions = predictions.map(({text, output, prediction}, i) => ({
            text, output, prediction, mlPrediction: items[i].prediction 
        }))
        axios.post(url, { predictions: summarizedPredictions })

    }, [predictions, items])

    return <div className="table-container">
<table className='table is-fullwidth'>
    <thead>
        <tr className={'is-light'}>
            <th style={TABLE_HEADER_STYLE} colSpan={7}> 
                Predictions Table 
            </th>
            <th>
            <button 
            onClick={makePredictions}
            className={`button is-info`} 
        > Make Predictions </button>

            </th>
        </tr>

        <tr className={'is-light'}>
            <th style={{color:'black', minWidth:340}}> Text </th>
            <th style={{color:'black'}}> Outcome </th>
            <th style={{color:'black'}}> Prediction </th>
            {/* TODO: Include difference (Maybe as standard deviation). */}
            { clusters && <th style={{color:'black'}}> Cluster </th> }

            { [...Array(5)].map((_, i) => 
                <th style={{color:'black', textAlign:'center'}}> No. { i } </th>
            )}
        </tr>
    </thead>

    <tbody>
        {predictions.sort(({output:a}, {output:b})=> a > b ? -1 : 1)
        .map((f, i) => {

            const sortedLabels = f.labels.sort((a, b) => 
                (a.score - CORRELATIONS.find(({label}) => a.label === label)!.mean) > 
                (b.score - CORRELATIONS.find(({label}) => b.label === label)!.mean)
                ? -1 : 1
            )
            return <tr key={i}>
                <td style={{maxWidth:360}}> {f.text} </td>
                <td style={{textAlign:'center'}}> {numberFormater(f.output)} </td>
                <td style={{textAlign:'center'}}> {numberFormater(f.prediction)} </td>
                { clusters && <td> {clusters[f.cluster].name} </td> }

                { [...Array(5)].map((_, i) => <td> 
                    { sortedLabels[i].label } ( 
                        {Math.round(sortedLabels[i].score)}/ 
                        {Math.round(CORRELATIONS.find(({label}) => sortedLabels[i].label === label)!.mean)}
                    )
                </td>)}
            </tr>
        })}
    </tbody>
</table>
</div>}

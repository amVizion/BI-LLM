import { CSSProperties, useEffect, useState } from "react"
import CORRELATIONS from '../data/correlations.json'
import { iCluster, iItem } from "../utils/types"
import { numberFormater } from "../utils/utils"
import { iAction } from '../views/Items'
import { tScore } from "../utils/types"
import { Dropdown } from './PromptBox'

import axios from "axios"


const TABLE_HEADER_STYLE:CSSProperties = {
    color:'black', 
    textAlign:'center', 
    verticalAlign:'middle'
}

const API_URL = 'http://localhost:3000'

interface iPrediction {
    items:iItem[]
    clusters?:iCluster[]
    setAction:(action:iAction)=>void
}

export const Predictions = ({items, clusters, setAction}:iPrediction) => {
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

    const getColor = (item:tScore) => CORRELATIONS.find(({label}) => 
        item.label === label
    )!.rho > 0 ? 'palegreen' : 'lightcoral'


    return <div className="table-container">
<table className='table is-fullwidth'>
    <thead>
        <tr className={'is-light'}>
            <th style={TABLE_HEADER_STYLE} colSpan={6}> 
                Predictions Table 
            </th>
            <th>
                <Dropdown text={'Actions'} color='is-info'/> 
            </th>

            <th>
                <button 
                    onClick={makePredictions}
                    className={`button is-link`} 
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
                Math.abs(a.score * CORRELATIONS.find(({label}) => a.label === label)!.rho) > 
                Math.abs(b.score * CORRELATIONS.find(({label}) => b.label === label)!.rho)
                    ? -1 : 1
            )
            return <tr key={i}>
                <td 
                    style={{maxWidth:360, cursor:'pointer'}} 
                    onClick={() => setAction({type:'SIMILAR', value:f})}
                > {f.text} </td>
                <td style={{textAlign:'center'}}> {numberFormater(f.output)} </td>
                <td style={{textAlign:'center'}}> {numberFormater(f.prediction)} </td>
                { clusters && <td> {clusters[f.cluster].name} </td> }

                { [...Array(5)].map((_, i) => 
                    <td 
                        onClick={() => setAction({type:'ATTRIBUTE', value:sortedLabels[i].label })}
                        style={{ cursor:'pointer', color: getColor(sortedLabels[i]) }}
                    >  { sortedLabels[i].label } ({Math.round(sortedLabels[i].score)}) </td>
                )}
            </tr>
        })}
    </tbody>
</table>
</div>}

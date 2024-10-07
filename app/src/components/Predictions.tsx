import { iCluster, iItem, iCorrelation } from "../utils/types"
import { CSSProperties, useEffect, useState } from "react"
import { getTableColor, numberFormater } from "../utils/utils"
import { iAction } from '../views/Items'
import { Dropdown } from './PromptBox'

import axios from "axios"


const TABLE_HEADER_STYLE:CSSProperties = {
    color:'black', 
    textAlign:'center', 
    verticalAlign:'middle'
}

export const API_URL = 'http://localhost:3000'

interface iPrediction {
    items:iItem[]
    clusters?:iCluster[]
    correlations:iCorrelation[]
    setAction:(action:iAction)=>void
}

export const Predictions = ({items, clusters, correlations, setAction}:iPrediction) => {
    const [predictions, setPredictions] = useState<iItem[]>(items)
    const [type, setType] = useState<string>('SIMILAR')

    const makePrediction = async(item:iItem) => {
        try{
            const url = `${API_URL}/write/predictions`
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
            <th style={TABLE_HEADER_STYLE} colSpan={clusters ? 7 : 6}> 
                Predictions Table 
            </th>
            <th>
                <Dropdown text={'Actions'} color='is-info'>
                    <a className="dropdown-item" onClick={() => setType('SIMILAR')}> Similarity </a>
                    <a 
                        className="dropdown-item" 
                        onClick={() => setType('CHANNEL_DESC')}
                    > Describe channel </a>
                    <a 
                        className="dropdown-item"
                        onClick={() => setType('CHANNEL_PERF')}
                    > Channel performance </a>
                </Dropdown>
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
                Math.abs(a.score * correlations.find(({label}) => a.label === label)!.rho) > 
                Math.abs(b.score * correlations.find(({label}) => b.label === label)!.rho)
                    ? -1 : 1
            )
            return <tr key={i}>
                <td 
                    style={{maxWidth:360, cursor:'pointer'}} 
                    onClick={() => setAction({type, value:f, async: type !== 'SIMILAR'})}
                > {f.text} </td>
                <td style={{textAlign:'center'}}> {numberFormater(f.output)} </td>
                <td style={{textAlign:'center'}}> {numberFormater(f.prediction)} </td>
                { clusters && <td> {clusters[f.cluster].name || clusters[f.cluster].index } </td> }

                { [...Array(5)].map((_, i) => 
                    <td 
                        onClick={() => setAction({ type:'ATTRIBUTE', value:sortedLabels[i].label })}
                        style={{ cursor:'pointer', color: getTableColor(sortedLabels[i], correlations) }}
                    >  { sortedLabels[i].label } ({Math.round(sortedLabels[i].score)}) </td>
                )}
            </tr>
        })}
    </tbody>
</table>
</div>
}

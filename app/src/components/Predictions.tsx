import { numberFormater } from "../utils/utils"
import { iItem } from "../utils/types"


interface iPrediction {items:iItem[]}
export const Predictions = ({items}:iPrediction) => {

return <div className="table-container">
<table className='table is-fullwidth'>
    <thead>
        <tr className={'is-light'}>
            <th style={{color:'black', textAlign:'center'}} colSpan={9}> 
                Predictions Table 
            </th>
        </tr>

        <tr className={'is-light'}>
            <th style={{color:'black'}}> Text </th>
            <th style={{color:'black'}}> Outcome </th>
            <th style={{color:'black'}}> Prediction </th>
            {/* TODO: Include difference (Maybe as standard deviation). */}
            <th style={{color:'black'}}> Cluster </th>

            { [...Array(5)].map((_, i) => 
                <th style={{color:'black'}}> No. { i } </th>
            )}
        </tr>
    </thead>

    <tbody>
        {items.sort(({output:a}, {output:b})=> a > b ? -1 : 1)
        .map((f, i) => {

            const sortedLabels = f.labels.sort(({score:a}, {score:b}) => a > b ? -1 : 1)
            return <tr key={i}>
                <td style={{maxWidth:360}}> {f.text} </td>
                <td> {numberFormater(f.output)} </td>
                <td> {numberFormater(f.prediction)} </td>
                <td> {f.cluster} </td>

                { [...Array(5)].map((_, i) => 
                    <td> { sortedLabels[i].label } ({ Math.round(sortedLabels[i].score) }) </td>
                )}
            </tr>
        })}
    </tbody>
</table>
</div>}

/*

Correlations:
- Rows Clusters + Total
- Columns Attributes (Labels)

For each Cluster:
- Average score.

*/

import { iCluster, iCorrelation } from "../utils/types"


export const TD = ({value}:{value?:number}) => value ? <td>  { Math.round(value*100)/100 } </td> : <td />

interface iCorrelations { clusters:iCluster[], correlations:iCorrelation[] }
export const Correlations = ({ clusters, correlations }:iCorrelations) => <table className='table is-fullwidth'>
<thead>
    <tr className={'is-light'}>
        <th colSpan={10} style={{color:'black', textAlign:'center'}}> 
            Correlations Table 
        </th>
    </tr>  

    <tr className={'is-light'}>
        <th style={{color:'black'}}> </th>
        <th colSpan={3} style={{color:'black', textAlign:'center'}}> Total </th>
        { clusters.map(({ name, index })=> 
            <th colSpan={2} key={index} style={{color:'black', textAlign:'center'}}> 
                { name || `Cluster #${index}` } 
            </th>
        )}
    </tr>

    <tr className={'is-light'}>
        <th style={{color:'black'}}> Attribute </th>
        <th style={{color:'black'}}> Rho </th>
        <th style={{color:'black'}}> Mean </th>
        <th style={{color:'black'}}> SD </th>

        { clusters.map(()=> <>
            <th style={{color:'black'}}> Mean </th>
            <th style={{color:'black'}}> Rho </th>
        </>)}
    </tr>
</thead>

<tbody>
    {/* Map through the attributes. Get the correlations */ }
    {
        correlations.map(({ label, rho, mean, sd }, i) => <tr key={i}>
            <td> { label } </td>
            <TD value={ rho } />
            <TD value={ mean } />
            <TD value={ sd } />

            { clusters.map(({ attributes }) => {
                const { average, correlation } = attributes.find(({ label:l }) => l === label)!
                return <>
                    <TD value={ average } />
                    <TD value={ correlation } />
                </>
            })}
        </tr>)
    }
</tbody>
</table>

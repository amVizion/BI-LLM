export const numberFormater = (value:string|number) => {
    const number = Number(value)
    if(number > 1000*1000*1000) return Math.round(number/(1000*1000*1000)).toString() + 'B'
    if(number > 1000*1000) return Math.round(number/(1000*1000)).toString() + 'M'
    if(number > 1000) return Math.round(number/1000).toString() + 'K'

    return Math.round(number).toString()
}

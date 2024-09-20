export const numberFormater = (value:string|number, longFormat?:boolean) => {
    const number = Number(value)

    if(number > 1000*1000*1000) return Math.round(number/(1000*1000*1000)).toString() + 'B'
    if(number > 1000*1000) return Math.round(number/(1000*1000)).toString() + (longFormat ? ' millions' : 'M')
    if(number > 1000) return Math.round(number/1000).toString() + (longFormat ? ' thousand' : 'K')

    return Math.round(number).toString()
}


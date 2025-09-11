import { ConsoleLogger } from "./Console"

type error = {
    code : number,
    message : string 

}
export default function createError(code:number, message:string):error{
    ConsoleLogger.error(message)
    return {code,message}
}
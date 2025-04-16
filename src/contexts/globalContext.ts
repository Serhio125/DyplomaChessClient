import {createContext} from "react";
import {TypeGlobalContext} from "./typeGlobalContext";


const GlobalContext =createContext<TypeGlobalContext | undefined>(undefined);

export default GlobalContext;
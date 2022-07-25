import { createContext, ReactNode, useState } from "react";

interface CalculatorContextData {
    displayValue: string;
    firstOperand: number;
    hasSecondOperand: boolean;
    operator: string;
    actions: (valueButton: string) => void;
    history: Array<string>;
    resetHistory: () => void;
}

interface CalculatorProviderProps {
    children: ReactNode;
}

export const CalculatorContext = createContext({} as CalculatorContextData)

export function CalculatorProvider({children}: CalculatorProviderProps) {
    const [displayValue, setDisplayValue] = useState("0");
    const [firstOperand, setFirstOperand] = useState(null);
    const [hasSecondOperand, setHasSecondOperand] = useState(false);
    const [operator, setOperator] = useState(null);
    const [history, setHistory] = useState([]);

    function inputDigit(digit: string) {
        if (hasSecondOperand === true) {
            setDisplayValue(digit);
            setHasSecondOperand(false);
        } else {
            setDisplayValue(displayValue === "0" ? digit : displayValue + digit);
        }
    }

    function inputDecimal(dot: string) {
        if (hasSecondOperand === true) {
            setDisplayValue("0.");
            setHasSecondOperand(false);
            return
        }

        if (!displayValue.includes(dot)) {
            setDisplayValue(displayValue + dot);
        }
    }

    function handleOperator(nextOperator: string) {
        const inputValue = parseFloat(displayValue);
        
        if (operator && hasSecondOperand)  {
            setOperator(nextOperator);
            return;
        }


        if (firstOperand == null && !isNaN(inputValue)) {
            setFirstOperand(inputValue);
        } else if (operator) {
            const result = calculate(firstOperand, inputValue, operator);
            
            setDisplayValue(`${parseFloat(result.toFixed(7))}`);
            setFirstOperand(result);
            
            if(operator !== '=')
                saveHistory(firstOperand, inputValue, operator, result);
        }

        setHasSecondOperand(true);
        setOperator(nextOperator);
        
    }

    function calculate(firstOperand: number, secondOperand: number, operator: string) {
        if (operator === '+') {
            return firstOperand + secondOperand;
        } else if (operator === '-') {
            return firstOperand - secondOperand;
        } else if (operator === '*') {
            return firstOperand * secondOperand;
        } else if (operator === '/') {
            return firstOperand / secondOperand;
        }
        
        return secondOperand;
    }

    function saveHistory(firstOperand: number, secondOperand: number, operator: string, result:number) {
        let item = `${firstOperand} ${operator} ${secondOperand} ${'='} ${result}`;
        setHistory(()=>history.concat(item));
    }

    function resetHistory() {
        setHistory([]);
    }

    function resetCalculator() {
        setDisplayValue("0");
        setFirstOperand(null);
        setHasSecondOperand(false);
        setOperator(null);
    }


    function actions(valueButton: string){
        switch (valueButton) {
            case '+':
            case '-':
            case '*':
            case '/':
            case '=':
                handleOperator(valueButton);
            break;
            case '.':
                inputDecimal(valueButton);
            break;
            case 'all-clear':
                resetCalculator();
            break;
            default:
            if (Number.isInteger(parseFloat(valueButton))) {
                inputDigit(valueButton);
            }
        }
    }

    return (
        <CalculatorContext.Provider value={{
            displayValue,
            firstOperand,
            hasSecondOperand,
            operator,
            actions,
            history,
            resetHistory
        }}>
            {children}
        </CalculatorContext.Provider>
    )
}
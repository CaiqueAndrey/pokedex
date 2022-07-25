import 'styled-components';

//add module of theme in styled-components
declare module 'styled-components' {
    export interface DefaultTheme {
        title: string,

        colors: {
            background: string;
            header: string;
            switchHeader: string;
            text: string;

            calculator: string;
            screenCalculator: string;
            btStandardCalculator: string;
            btOperatorCalculator:string;
            btEqualCalculator: string;
            btACCalculator: string;        
        }
    }
}
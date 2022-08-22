import 'styled-components';

//add module of theme in styled-components
declare module 'styled-components' {
    interface PokemonTypes {
        background: string;
        color: string;
    }
    export interface DefaultTheme {
        title: string;

        colors: {
            background: string;
            header: string;
            footer: string;
            switchHeader: string;
            text: string;

            calculator: string;
            screenCalculator: string;
            btStandardCalculator: string;
            btOperatorCalculator:string;
            btEqualCalculator: string;
            btACCalculator: string;          
        }

        pokemons: {
            types: {
                steel: PokemonTypes;
                fire: PokemonTypes;
                grass: PokemonTypes;
                electric: PokemonTypes;
                water: PokemonTypes;
                ice: PokemonTypes;
                ground: PokemonTypes;
                rock: PokemonTypes;
                fairy: PokemonTypes;
                poison: PokemonTypes;
                bug: PokemonTypes;
                dragon: PokemonTypes;
                psychic: PokemonTypes;
                flying: PokemonTypes;
                fighting: PokemonTypes;
                normal: PokemonTypes;
                ghost: PokemonTypes;
                default: PokemonTypes;
            }
        } 
    }
}
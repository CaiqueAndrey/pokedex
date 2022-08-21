import { createContext, Dispatch, ReactNode, SetStateAction, useState } from "react";

interface TypePokemonData {
    slot: number;
    type: {
        name: string;
        url: string;
    }
}
interface PokemonsData {
    types: Array<TypePokemonData>;
    id: string;
    name: string;
}

interface PokedexContextData {
    getPokemons: (id: number) => void;
    pokemons: Array<PokemonsData>;
    searchPokemon: (type: string, valueSearch: string) => void;
    filteredPokemons: Array<PokemonsData> | Array<void>;
    search: string;
}

interface PokedexProviderProps {
    children: ReactNode;
}

export const PokedexContext = createContext({} as PokedexContextData)

export function PokedexProvider({children}: PokedexProviderProps) {
    const [pokemons, setPokemons] = useState<Array<PokemonsData>>([]);
    const [search, setSearch] = useState('');
    const [searchType, setSearchType] = useState('');

    async function getPokemons(id: number){

        try {
            let response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            let pokemon = await response.json();
            
            return setPokemons(oldPokemons => {
                return [pokemon, ...oldPokemons].sort((a,b)=> a.id-b.id);
            });
        } catch (error) {
            console.log(error);
        }
    } 

    let filteredPokemons = [];

    function searchPokemon(type: string, valueSearch: string) {
        switch (type) {
            case 'name':
                setSearch(valueSearch);     
                filteredPokemons = pokemons.filter(poke => poke.name.includes(search))
                break;
            case 'type':
                setSearch(valueSearch);
                filteredPokemons = pokemons.map(pokemon => {
                    return pokemon.types.filter(poke => poke.type.name.includes(search))
                });
                console.log('filtered type', filteredPokemons)
                break;
        
            default:
                break;
        }
    }


    return (
        <PokedexContext.Provider value={{
            getPokemons,
            pokemons,
            searchPokemon,
            filteredPokemons,
            search
        }}>
            {children}
        </PokedexContext.Provider>
    )
}
import { createContext, Dispatch, ReactNode, SetStateAction, useState } from "react";

interface PokemonsData {
    types: Array<object>;
    id: string;
    name: string;
}

interface PokedexContextData {
    getPokemons: (id: number) => void;
    pokemons: Array<PokemonsData>;
    searchPokemon: (valueSearch: string) => void;
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

    function searchPokemon(valueSearch: string) {
        setSearch(valueSearch);
    }

    const filteredPokemons = search.length > 0 
        ? pokemons.filter(poke => poke.name.includes(search))
        : [];

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
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

    const filteredPokemons = search.length > 0 
        ? pokemons.filter(poke => poke.name.includes(search))
        : [];

    function searchPokemon(valueSearch: string) {
        // if (search.length === 0){
        //     filteredPokemons = [];
        // }
        setSearch(valueSearch);
        // console.log('search seted', search);

        /* switch (type) {
            case 'name':
                filteredPokemons = [];     
                filteredPokemons = pokemons.filter(poke => poke.name.includes(search))
                break;
            case 'type':
                filteredPokemons = [];
                console.log('search', search);
                filteredPokemons = pokemons.map(pokemon => {
                    // console.log('pokemon', pokemon)
                    pokemon.types.forEach(poke => {
                        if(poke.type.name.includes(search)){
                            filteredPokemons.push(pokemon);
                            // console.log('filteredPokemons', filteredPokemons);
                        }

                    });
                });
                break;
        
            default:
                break;

        } */
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
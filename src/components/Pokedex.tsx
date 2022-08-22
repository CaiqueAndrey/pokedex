import { useContext, useEffect, useState } from 'react';
import { PokedexContext } from '../contexts/PokedexContext';
import { Div } from '../styles/components/Pokedex';
import Pokemon from './Pokemon';

export function Pokedex() {
    const { 
        pokemons, 
        getPokemons, 
        search, 
        filteredPokemons 
    } = useContext(PokedexContext);

    const [loading, setLoading] = useState(false);

    const types = [{type:{name:'fire'}},{type:{name:'water'}},{type:{name:'grass'}}];

    useEffect(()=> {
        for (let index = 1; index <= 150; index+= 1) {
            setLoading(true);
            getPokemons(index);
            if(index === 150){
                setLoading(false);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Div>
                <>
                    { loading && <div>Carregando...</div> }
                    {
                        search.length > 0  ? 
                        (
                            filteredPokemons.map((pokemon, index) => {
                                return (
                                    <Pokemon 
                                    types={pokemon.types}
                                    pokemonId={pokemon.id}
                                    pokemonName={pokemon.name}
                                    key={index}
                                    />
                                )
                            })
                        ) : (
                            pokemons.map((pokemon, index) => {
                                return (
                                    <Pokemon 
                                    types={pokemon.types}
                                    pokemonId={pokemon.id}
                                    pokemonName={pokemon.name}
                                    key={index}
                                    />
                                )
                            })
                        )
                    }
                </>
                
            </Div>
        </>
    );
}
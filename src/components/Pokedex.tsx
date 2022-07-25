import { useEffect, useState } from 'react';
import { Div } from '../styles/components/Pokedex';
import Pokemon from './Pokemon';

export function Pokedex() {

    // const [pokemons, setPokemons] = useState([]);
    const [loading, setLoading] = useState(true);
    const pokemons = [];
    
    const getPokemons = async (id: number) => {
        try {
            let response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            let pokemon = await response.json();
            console.log('pokemono', typeof pokemon);
            console.log('pokemono', pokemons);
            return pokemons.push(pokemon);
          } catch (error) {
            console.log(error);
          }
    }

    useEffect(()=> {
        for (let index = 1; index <= 2; index++) {
            getPokemons(index);
            if(index === 2)
                setLoading(false);
          }
    }, [pokemons])

    return (
        <>
            <Div>
                <>
                    { loading && <div>Carregando...</div> }
                    {
                        pokemons.map((pokemon, index) => {
                            console.log('pokemonmap--->', pokemon[index].name);
                            return (
                                <Pokemon 
                                types={pokemon[index].types}
                                pokemonId={pokemon[index].id}
                                pokemonName={pokemon[index].name}
                                key={index}
                                    />
                            )
                        })
                    }
                </>
            </Div>
        </>
    );
}
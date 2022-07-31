import { useEffect, useState } from 'react';
import { Div } from '../styles/components/Pokedex';
import Pokemon from './Pokemon';

export function Pokedex() {

    const [pokemons, setPokemons] = useState([]);
    const [loading, setLoading] = useState(false);
    //const pokemons = [];
    const types = [{type:{name:'fire'}},{type:{name:'water'}},{type:{name:'grass'}}];

    useEffect(()=> {
        const getPokemons = async (id: number) => {
            setLoading(true);
            try {
                let response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                let pokemon = await response.json();

                // console.log('pokemono', pokemons);
                return setPokemons({...pokemon});
              } catch (error) {
                console.log(error);
              }
        }

        // for (let index = 1; index <= 2; index+= 1) {
        //     //getPokemons(index);
        //     if(index === 2){
        //         setLoading(false);
        //     }

        //     console.log('index->',index);
        // }
    }, []);

    return (
        <>
            <Div>
                {/* <>
                    { loading && <div>Carregando...</div> }
                    {
                        pokemons.length >  0 &&
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
                </> */}
                
                <Pokemon 
                types={types}
                pokemonId={'4'}
                pokemonName={'Charmander'}
                key={1}
                    />
            </Div>
        </>
    );
}
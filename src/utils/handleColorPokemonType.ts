import theme from '../styles/themes/light';

const handleColorPokemonType = (type: string, styleType: string) => {
    const { types } = theme.pokemons;

    switch (type) {
        case 'steel': {
            if (styleType === 'background')
                return types.steel.background;
            else 
                return types.steel.color;
        }
        case 'fire': {
            if (styleType === 'background')
                return types.fire.background;
            else 
                return types.fire.color;
        }
        case 'grass':{
            if (styleType === 'background')
                return types.grass.background;
            else 
                return types.grass.color;
        }
        case 'electric': {
            if (styleType === 'background')
                return types.electric.background;
            else 
                return types.electric.color;
        }
        case 'water':{
            if (styleType === 'background')
                return types.water.background;
            else 
                return types.water.color;
        }
        case 'ice': {
            if (styleType === 'background')
                return types.ice.background;
            else 
                return types.ice.color;
        }
        case 'ground': {
            if (styleType === 'background')
                return types.ground.background;
            else 
                return types.ground.color;
        }
        case 'rock':{
            if (styleType === 'background')
                return types.rock.background;
            else 
                return types.rock.color;
        }
        case 'fairy':{
            if (styleType === 'background')
                return types.fairy.background;
            else 
                return types.fairy.color;
        }
        case 'poison':{
            if (styleType === 'background')
                return types.poison.background;
            else 
                return types.poison.color;
        }
        case 'bug':{
            if (styleType === 'background')
                return types.bug.background;
            else 
                return types.bug.color;
        }
        case 'dragon':{
            if (styleType === 'background')
                return types.dragon.background;
            else 
                return types.dragon.color;
        }
        case 'psychic':{
            if (styleType === 'background')
                return types.psychic.background;
            else 
                return types.psychic.color;
        }
        case 'flying':{
            if (styleType === 'background')
                return types.flying.background;
            else 
                return types.flying.color;
        }
        case 'fighting':{
            if (styleType === 'background')
                return types.fighting.background;
            else 
                return types.fighting.color;
        }
        case 'normal':{
            if (styleType === 'background')
                return types.normal.background;
            else 
                return types.normal.color;
        }  
        case 'ghost':{
            if (styleType === 'background')
                return types.ghost.background;
            else 
                return types.ghost.color;
        }  
        default: {
            if (styleType === 'background')
                return types.default.background;
            else 
                return types.default.color;
        }
    }
}

export default handleColorPokemonType;

import { DefaultTheme } from "styled-components";

const theme: DefaultTheme = {
  title: 'light',

  colors: {
    background: '#EFEFBB',
    header: '#D6060B',
    footer: '#A0A0A0',
    switchHeader: '#D6060B',
    text: '#FFF',

    calculator: '#E6E6E6',
    screenCalculator: '#C4C5CC',
    btStandardCalculator: '#FAFAFA',
    btOperatorCalculator: '#8FB8ED',
    btEqualCalculator: '#3590F3',
    btACCalculator: '#F03A47',

  },

  pokemons: {
    types: { 
      steel: { 
        background: '#6C9193', color: '#000',
      },
      fire: { 
        background: '#AD1700', color: '#FFF',
      },
      grass: { 
        background: '#40AD00', color: '#000',
      },
      electric: { 
        background: '#FCF15A', color: '#000',
      },
      water: { 
        background: '#4592E7', color: '#000',
      },
      ice: { 
        background: '#51C4E7', color: '#000',
      },
      ground: { 
        background: '#AB9842', color: '#000',
      },
      rock: { 
        background: '#A38C21', color: '#000',
      },
      fairy: { 
        background: '#D01180', color: '#FFF',
      },
      poison: { 
        background: '#AF05E4', color: '#FFF',
      },
      bug: { 
        background: '#729F3F', color: '#FFF',
      },
      dragon: { 
        background: '#98B3E6', color: '#000',
      },
      psychic: { 
        background: '#F366B9', color: '#000',
      },
      flying: { 
        background: '#BDB9B8', color: '#000',
      },
      fighting: { 
        background: '#D97629', color: '#000',
      },
      normal: { 
        background: '#F5F5F5', color: '#000',
      },
      ghost: { 
        background: '#760A49', color: '#FFF',
      },
      default: { 
        background: '#FFF', color: '#000',
      },
    }
  }
};

export default theme;

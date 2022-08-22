import styled from 'styled-components';
import theme from '../themes/light';
import { handleColorPokemonType } from '../../utils';


export const Card = styled.div`
    list-style: none;
    margin: 15px;
    padding: 40px 0;
    color: #222;
    text-align: center;
    border-radius: 20px;
    position: relative;
    background-color: ${({ color }) => handleColorPokemonType(color, 'background')};

    &:after {
        content: "";
        display: block;
        width: 50%;
        height: 45%;
        border-radius: 100%;
        background-color: #fff;
        opacity: .7;
        position: absolute;
        top: 15%;
        left: 25%;
    }

    &:hover {
        animation: bounce 0.5s linear;
    }
`;
export const CardDescription = styled.span`
    display: inline-block;
    width: 100%;
    background-color: #1A1617;
    z-index: 1;
`;

export const CardTitle = styled.h2`
    text-transform: capitalize;
	margin-bottom: 0px;
	font-size: 32px;
	font-weight: normal;
	position: relative;
	z-index: 2;
    color: #FFF;
`;

export const CardSubtitle = styled.label`
    text-transform: capitalize;
    display: inline-block;
    margin: 5px 5px;
    padding: 0 10px;
    background-color: ${({ color }) => handleColorPokemonType(color, 'background')};
    color: ${({ color }) => handleColorPokemonType(color, 'color')};;
    position: relative;
    border-radius: 5px;
    z-index: 2;
`;

export const CardImage = styled.img`
    height: 180px;
    position: relative;
    z-index: 2;
`;

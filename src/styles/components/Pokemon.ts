import styled from 'styled-components';

const handleColorType = (type: string) => {
    switch (type) {
        case 'steel':
            return '#F4F4F4';
        case 'fire':
            return '#FDDFDF';
        case 'grass':
            return '#DEFDE0';
        case 'eletric':
            return '#FCF7DE';
        case 'water':
            return '#DEF3FD';
        case 'ice':
            return '#DEF3FD';
        case 'ground':
            return '#F4E7DA';
        case 'rock':
            return '#D5D5D4';
        case 'fairy':
            return '#FCEAFF';
        case 'poison':
            return '#98D7A5';
        case 'bug':
            return '#F8D5A3';
        case 'dragon':
            return '#98B3E6';
        case 'psychic':
            return '#EAEDA1';
        case 'flying':
            return '#F5F5F5';
        case 'fighting':
            return '#E6E0D4';
        case 'normal':
            return '#F5F5F5';    
        default:
            return '#FFF';
    }
}

export const Card = styled.div`
    list-style: none;
    margin: 15px;
    padding: 40px;
    color: #222;
    text-align: center;
    border-radius: 20px;
    position: relative;
    background-color: ${({ color }) => handleColorType(color)};

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

export const CardTitle = styled.h2`
    text-transform: capitalize;
	margin-bottom: 0px;
	font-size: 32px;
	font-weight: normal;
	position: relative;
	z-index: 2;
`;

export const CardSubtitle = styled.strong`
    margin-top: 5px;
    color: #666;
    font-weight: lighter;
    position: relative;
    z-index: 2;
`;

export const CardImage = styled.img`
    height: 180px;
    position: relative;
    z-index: 2;
`;

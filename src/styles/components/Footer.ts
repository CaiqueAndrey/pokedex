import styled from 'styled-components';

export const Div = styled.div`
    width: 100%;
    height: 15vh;
    margin: 0;
    padding: 2rem;
    background: ${props => props.theme.colors.footer};
    
    display: flex;
    justify-content: center;
    align-items: center;
    
    p {
        color: #000;
        img{
            width: 5rem;
            height: 2.5rem;
        }
    }

    @media screen and (max-width:1400px){
        span {
            strong {
                font-size: 2.5rem;
                margin-left: 0.5rem;
            }
    
            svg{
                width: 2rem;
                height: 2rem;
            }
        }
    }

    @media screen and (max-width:768px){
        span {
            display: flex;
            justify-content: space-between;
            align-items: center;

            strong {
                font-size: 1.5rem;
                margin-left: 1rem;
            }
            
        }
        
    }
`;
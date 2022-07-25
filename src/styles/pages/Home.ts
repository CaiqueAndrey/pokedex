import styled from 'styled-components';

export const Div = styled.div`
    height: 100vh;
    display: flex;
    flex-direction: column;

    section {
        flex: 1;

        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
        gap: 2.25rem;
    }

    @media(max-width:768px){
        section {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.25rem;
        }
    }
`;
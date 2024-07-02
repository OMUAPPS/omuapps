export const prerender = true;

export async function load() {
    const versions = await fetch(
        'https://github.com/OMUAPPS/omuapps/releases/latest/download/latest.json',
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow',
        },
    ).then((res) => res.json());

    return { versions };
}

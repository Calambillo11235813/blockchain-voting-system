import psycopg2

conn = psycopg2.connect(
    host='localhost',
    dbname='Votaciones_Blockchain',
    user='postgres',
    password='nicolas123',
)
cur = conn.cursor()

cur.execute("""
    SELECT id, titulo, estado, "estaActiva", fecha
    FROM eleccion
    ORDER BY fecha DESC
    LIMIT 10
""")
print('TODAS LAS ELECCIONES:')
for row in cur.fetchall():
    print(' ', row)

cur.execute("""
    SELECT id, titulo, estado, "estaActiva", fecha
    FROM eleccion
    WHERE "estaActiva" = true OR estado = 'ACTIVA'
    ORDER BY "estaActiva" DESC, fecha DESC
    LIMIT 1
""")
eleccion = cur.fetchone()
if not eleccion:
    print('NO_ACTIVE_ELECTION - usando seed fixture ELECCION_ID')
    eid = 'eeeeeeee-eeee-eeee-eeee-000000000001'
else:
    eid, titulo, estado, esta_activa, fecha = eleccion
    print('ELECCION ACTIVA:', eid, titulo, estado, esta_activa, fecha)

cur.execute("""
    SELECT ec.id, c.nombre, ec.alcance, ec.orden
    FROM eleccion_cargo ec
    JOIN cargo c ON c.id = ec."cargoId"
    WHERE ec."eleccionId" = %s
    ORDER BY ec.orden
""", (eid,))
papeletas = cur.fetchall()
print('PAPELETAS:')
for p in papeletas:
    print(' ', p)

if papeletas:
    papeleta_id = papeletas[0][0]
    cur.execute("""
        SELECT ca.id, ca.nombres, ca.apellidos, ca."rolEspecifico"
        FROM candidato ca
        WHERE ca."eleccionCargoId" = %s
        LIMIT 3
    """, (papeleta_id,))
    print('CANDIDATOS (primera papeleta):')
    for c in cur.fetchall():
        print(' ', c)

conn.close()

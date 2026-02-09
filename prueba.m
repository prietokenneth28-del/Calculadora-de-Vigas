clc
clear
syms x c1 c2

soportes = struct();

soportes.tipo = ["empotrada", "articulada", "rodamiento"];
soportes.grados = [2,1,1];

%Apoyos a calcular:
apoyos = struct();

apoyos.nombre   = 'Ra';
apoyos.posicion = 0;
apoyos.tipo     = soportes.tipo(1);  %Empotrada.

% apoyos(end+1).nombre = 'Rb';
% apoyos(end).posicion = 6;
% apoyos(end).tipo     = soportes.tipo(2);  %Articulada.

apoyos(end+1).nombre = 'Rc';
apoyos(end).posicion = 12;
apoyos(end).tipo     = soportes.tipo(1);  %Articulada.

msim = c1 * x + c2; % Para almacenar la ecuacion:
MSIM = 0;
%Validacion del tipo de apoyo para calcular el momento:

var  = sym('R', [1 length(apoyos)]); %Reacciones a calcular:
varM = sym('M', [1 length(apoyos)]); %Momento a calcular

varM1 = 0;
%Se haya la ecuacion general de singularidad simbolica para las reacciones:
for j = 1:length(apoyos)
    if apoyos(j).tipo == soportes.tipo(1)
        posicion = double(apoyos(j).posicion);

        %------------------------------DEFLEXION:--------------------------------
        %Momento:
        msim = (varM(j) / 24) * (x - posicion)^4 * heaviside(x - posicion) + msim;
        %Fuerza:
        msim = (var(j) / 6) * (x - posicion)^3 * heaviside(x - posicion) + msim;
        
        %------------------------------MOMENTO-----------------------------------
        %Momento:
        MSIM = varM(j) * (x - posicion)^0 * heaviside(x - posicion) + MSIM;
        %Fuerza:
        MSIM = var(j)  * (x - posicion)^1 * heaviside(x - posicion) + MSIM;


        varM1 = [varM1 varM(j)]; %Vector para almacenar las incognitas de Momento en empotramiento
    else
        posicion = double(apoyos(j).posicion);

        %------------------------------DEFLEXION:--------------------------------
        msim = (var(j) / 6) * (x - posicion)^3 * heaviside(x - posicion) + msim; 

        %------------------------------MOMENTO-----------------------------------
        MSIM = var(j)  * (x - posicion)^1 * heaviside(x - posicion) + MSIM;
    end

end
varM1 = varM1(2:end);

%Determinacion del sistema de ecuaciones:
ec = sym(zeros(length(apoyos),1)); %Cantidad de ecuaciones 
ecM = sym(zeros(2,1));   %Condiciones de Frontera para momento
paso = 0.01;
for i = 1:length(apoyos)
    posicion = double(apoyos(i).posicion);
    ec(i,1)  = subs(msim,x,posicion);
end

%Ecuaciones de condiciones de frontera para el momento:
ecM(1,1) = subs(MSIM,x,0);
ecM(2,1) = subs(MSIM,x,l);

ecM
ec

